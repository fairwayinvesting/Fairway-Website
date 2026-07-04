#!/usr/bin/env python3
"""Generate area report HTML files — Batch 1: Bacchus Marsh, Bendigo, Lara"""

import os

OUT_DIR = os.path.join(os.path.dirname(__file__), 'reports')

# ─── MARKET DATA ─────────────────────────────────────────────────────────────

MARKETS = [

  # ── 1. BACCHUS MARSH ────────────────────────────────────────────────────────
  dict(
    filename='bacchus-marsh.html',
    key='bacchus_marsh',
    city='Bacchus Marsh',
    state_badge='Victoria',
    subtitle='Affordable Melbourne commuter market · 55km west of Melbourne CBD · Moorabool Shire',
    loc_stats=[
      ('55km',    'Melbourne CBD'),
      ('~55min',  'V/Line (Ballarat line)'),
      ('70km',    'Melbourne Airport'),
      ('#1',      'Fastest growing LGA in VIC'),
    ],
    loc_copy=(
      'Bacchus Marsh sits in the Lerderderg Gorge valley, 55km west of Melbourne on the Western '
      'Freeway corridor. V/Line\'s Ballarat line provides direct access to Southern Cross Station, '
      'making it one of the most accessible commuter markets in Victoria relative to its price point. '
      'As Melbourne\'s urban fringe continues to expand westward, Bacchus Marsh represents an '
      'affordable entry into the commuter belt with genuine scarcity of rental stock.'
    ),
    education=[
      'Bacchus Marsh College',
      "St Bernard's College",
      'Maddingley Primary School',
      'Western Heights College',
    ],
    healthcare=[
      'Bacchus Marsh &amp; Melton Regional Hospital',
      'Melton Health Services',
      'Djerriwarrh Health Services',
      'Local GP and allied health network',
    ],
    retail=[
      'Bacchus Marsh Village Shopping Centre',
      'Centrepoint Shopping Centre',
      'Main Street retail precinct',
      'Glenmore Park shopping',
    ],
    transport=[
      'V/Line Ballarat Line (55min to Southern Cross)',
      'Western Freeway direct to Melbourne',
      'Bacchus Marsh train station',
      'Melton bus connections',
    ],
    infra_total='$3.2B+',
    infra_cards=[
      dict(
        value='$1.1B+',
        title='Western Freeway Upgrade',
        desc='Dual-carriageway widening and safety upgrades along the key Melbourne–Ballarat corridor, directly improving travel time and accessibility for Bacchus Marsh residents and commuters.',
        status='Under construction',
      ),
      dict(
        value='$60M+',
        title='Bacchus Marsh &amp; Melton Regional Hospital Expansion',
        desc='Expanded emergency, surgical and outpatient facilities serving the rapidly growing Moorabool and Melton communities — a permanent employment anchor for the region.',
        status='Planning approved',
      ),
      dict(
        value='$2B+',
        title='Mount Atkinson Employment Precinct',
        desc='A major master-planned employment and residential precinct near Rockbank, expected to create 30,000+ jobs along the Western Freeway corridor, anchoring long-term population demand for the region.',
        status='Under development',
      ),
    ],
    macro_copy=(
      'Moorabool Shire is one of Australia\'s fastest-growing local government areas by percentage, '
      'adding residents at approximately 3% per year — driven overwhelmingly by Melbourne '
      'affordability pressure. The population skews young (median age 35), family-oriented and '
      'owner-occupier, reflecting a market of lifestyle changers and first-time buyers priced out '
      'of Melbourne\'s inner and middle rings.'
    ),
    macro_copy_p2=(
      'ABS projections place Moorabool\'s population at over 55,000 by 2031 — representing '
      'sustained housing demand pressure in a market with limited rental stock and constrained '
      'new supply in established pockets.'
    ),
    comparable_text=(
      'Bacchus Marsh\'s current profile — affordable Melbourne commuter corridor access, strong '
      'population growth in one of Victoria\'s fastest-growing LGAs, and structural rental undersupply '
      '— shares characteristics with Melton and Sunbury at comparable stages of their growth '
      'cycles. Past performance in those markets is not a guide to future performance in Bacchus Marsh.'
    ),
    affordability_text=(
      'At ~$580k median, Bacchus Marsh houses sit well below Melbourne\'s median while offering direct '
      'V/Line rail access to Southern Cross Station. As Melbourne\'s affordability pressure continues '
      'to push buyers westward, this discount has historically narrowed in comparable corridor markets.'
    ),
    investment_intro=(
      'Bacchus Marsh delivers what is increasingly rare in Victoria: genuine affordability within '
      'commuting distance of Melbourne, strong rental demand driven by population growth, and a '
      'market that hasn\'t yet repriced to reflect its infrastructure connectivity.'
    ),
    tags=[
      'Income-producing from settlement',
      'Melbourne commuter corridor premium',
      'Strong population growth, limited supply',
      'Buy, hold and benefit from infrastructure',
      'Long-term capital growth compounding',
      'Affordable entry into the Victorian market',
    ],
    entry_house='$520k–$680k+',
    entry_unit='$320k–$430k+',
    risks=[
      (
        'Western Freeway commute dependency',
        'Property values are partly underpinned by Melbourne\'s employment base. Structural shifts '
        'in commuter behaviour (e.g., sustained remote work) could soften owner-occupier demand '
        'from Melbourne workers, though the rental market remains driven by local and regional employment.',
      ),
      (
        'Limited local employment diversification',
        'Bacchus Marsh\'s economy is relatively narrow. Major local employers include agriculture, '
        'retail and healthcare. Growth is largely population-driven, making it sensitive to changes '
        'in Melbourne\'s broader economic health.',
      ),
      (
        'New supply in adjacent corridors',
        'Growth in the Melton and Rockbank growth areas adds supply on the urban fringe. Established '
        'Bacchus Marsh properties are largely insulated, but monitor new-build competition in '
        'the outer west corridor.',
      ),
    ],
    lukes_p1=(
      'Bacchus Marsh is a market I watch closely because it represents a dynamic that\'s becoming '
      'harder to find — genuine affordability in a Victorian commuter corridor, with a rental '
      'market that is structurally undersupplied relative to population growth. The fundamentals '
      'here are driven by people, not speculation.'
    ),
    lukes_p2=(
      'What I look for in this market is selectivity around established stock with good access to '
      'amenities and transport — properties that appeal to the growing professional renter '
      'base, not just the commuter-owner market. The right asset here can deliver strong yield '
      'from day one while sitting in a corridor where scarcity is only going to increase.'
    ),
    map_center=[-37.674, 144.434],
    map_zoom=11,
    map_pts=[
      dict(latlng=[-37.674, 144.434], label='Bacchus Marsh', color='#bd7a70', perm=True),
      dict(latlng=[-37.814, 144.963], label='Melbourne CBD', color='#cf9b92', perm=True),
      dict(latlng=[-37.685, 144.576], label='Melton', color='#cf9b92', perm=False),
    ],
    map_line=([-37.814, 144.963], [-37.674, 144.434]),
    lga_name='Moorabool Shire',
    heroPrice='~$580k', heroYield='4.5–6%', heroPopulation='42k', heroVacancy='0.5%',
    houseMedian=580000, unitMedian=370000,
    houseRentRange='$420–$490', unitRentRange='$320–$390',
    houseYieldRange='4.5–5.5%', unitYieldRange='5.5–6.5%',
    vacancyRate=0.5, daysOnMarket=20, clearanceRate=65, propertiesListed=210,
    popTotal=42000, popGrowth=3.2, medianAge=35, ownerOccupier=72, employed=67, unemployment=3.5,
    conditions=[
      ('Rental demand',              'Very High', 92),
      ('Stock on market',            'Very Low',  12),
      ('Buyer competition',          'High',      80),
      ('Infrastructure pipeline',    'Moderate',  50),
      ('Population growth momentum', 'Very High', 94),
    ],
    housePerf=[('1 year', 4.2, 42), ('3 years', 9.5, 95), ('5 years', 10.8, 100), ('10 years', 8.1, 81)],
    unitPerf= [('1 year', 3.0, 30), ('3 years', 7.2, 72), ('5 years', 8.0,  80), ('10 years', 6.2, 62)],
    data_sources=(
      'ABS Regional Population &amp; Census &nbsp;&middot;&nbsp; Infrastructure Australia Pipeline '
      '&nbsp;&middot;&nbsp; Victorian Government Major Projects Register &nbsp;&middot;&nbsp; '
      'SQM Research &nbsp;&middot;&nbsp; CoreLogic / Suburbtrends &nbsp;&middot;&nbsp; '
      'Moorabool Shire Council &nbsp;&middot;&nbsp; Map data &copy; OpenStreetMap contributors'
    ),
  ),

  # ── 2. BENDIGO ──────────────────────────────────────────────────────────────
  dict(
    filename='bendigo.html',
    key='bendigo',
    city='Bendigo',
    state_badge='Victoria',
    subtitle="Established regional city · 150km northwest of Melbourne · Victoria's fourth-largest city",
    loc_stats=[
      ('150km',   'Melbourne CBD'),
      ('~2hr',    'V/Line (Bendigo line)'),
      ('120km',   'Melbourne Airport'),
      ('#4',      'Largest city in VIC'),
    ],
    loc_copy=(
      'Bendigo sits at the foothills of the Great Dividing Range, 150km northwest of Melbourne. '
      'The V/Line Bendigo line connects the city directly to Southern Cross Station in approximately '
      'two hours — a commute that, while long for daily travel, positions Bendigo as a lifestyle '
      'and affordability alternative for Melbourne workers who have embraced hybrid arrangements. '
      'Bendigo is a fully self-contained regional city with its own hospital, university, arts '
      'precinct and growing professional employment base.'
    ),
    education=[
      'La Trobe University Bendigo',
      'Bendigo Senior Secondary College',
      'Catholic College Bendigo',
      "St Joseph's College",
    ],
    healthcare=[
      'Bendigo Base Hospital (major regional)',
      'St John of God Bendigo Hospital',
      'Bendigo Health network',
      'Bendigo Community Health Services',
    ],
    retail=[
      'Hargreaves Mall',
      'Bendigo Marketplace',
      'View Street arts &amp; dining precinct',
      'Eaglehawk retail centre',
    ],
    transport=[
      'V/Line Bendigo line (2hr to Melbourne)',
      'Calder Freeway direct to Melbourne',
      'Bendigo Airport',
      'City bus network',
    ],
    infra_total='$2.6B+',
    infra_cards=[
      dict(
        value='$630M',
        title='Bendigo Hospital Redevelopment',
        desc='The largest health infrastructure investment in Bendigo\'s history, delivering new surgical, emergency and inpatient facilities. Permanently expands the region\'s healthcare employment base and attracts skilled health professionals.',
        status='Under construction',
      ),
      dict(
        value='$500M+',
        title='La Trobe University Campus Expansion',
        desc='Ongoing investment in research and teaching facilities across the Bendigo campus, growing the student population and supporting the knowledge economy transition of the regional workforce.',
        status='Active',
      ),
      dict(
        value='$2B+',
        title='Regional Fast Rail Improvements',
        desc='Victorian Government investment in regional rail uplift statewide, including improved service frequency and infrastructure upgrades on the Bendigo line — directly supporting Melbourne connectivity.',
        status='Committed',
      ),
    ],
    macro_copy=(
      'Greater Bendigo is a diversifying regional economy, anchored historically in manufacturing '
      'and mining but increasingly driven by healthcare, education and professional services. '
      'La Trobe University and Bendigo Health are the city\'s two largest employers, supporting '
      'a relatively stable workforce. Population growth is steady, reflecting organic city growth '
      'and lifestyle migration from Melbourne.'
    ),
    macro_copy_p2=(
      'The city\'s ongoing investment in arts, culture and public space — including the '
      'Bendigo Art Gallery and the Ulumbarra Theatre — has contributed to a genuine shift in '
      'the city\'s identity and liveability credentials, attracting a professional demographic '
      'that supports sustained rental demand.'
    ),
    comparable_text=(
      'Bendigo\'s profile — established regional city, diversified employment, significant '
      'healthcare and education infrastructure investment — shares characteristics with markets '
      'such as Ballarat and Launceston at comparable stages of their infrastructure investment cycles. '
      'Past performance in those markets is not a guide to future performance in Bendigo.'
    ),
    affordability_text=(
      'At ~$470k median, Bendigo houses trade at a significant discount to both Melbourne and '
      'coastal lifestyle markets, with a yield profile that reflects genuine income generation. '
      'The city\'s self-contained economy means price growth is driven by local fundamentals '
      'rather than capital city proximity arbitrage.'
    ),
    investment_intro=(
      'Bendigo offers what regional cities rarely combine — genuine affordability, a '
      'diversified employment base, a fully functioning urban amenity set, and rental yields '
      'that Melbourne investors haven\'t seen in their own city for over a decade.'
    ),
    tags=[
      'High gross yield relative to entry price',
      'Established city infrastructure and amenity',
      'Healthcare and education employment anchors',
      'Buy, hold and benefit from rail connectivity',
      'Long-term capital growth compounding',
      'Strong rental demand, stable tenant base',
    ],
    entry_house='$400k–$580k+',
    entry_unit='$260k–$360k+',
    risks=[
      (
        'Economic concentration risk',
        'Healthcare and education are the dominant employers. A reduction in Federal or State '
        'funding to these sectors could soften local employment and rental demand, though both '
        'institutions have long-term infrastructure commitments that provide significant forward visibility.',
      ),
      (
        'Melbourne commute viability',
        'At approximately 2 hours, the Bendigo–Melbourne commute is at the outer limit for '
        'daily travel. Any shift toward mandatory return-to-office could reduce lifestyle migrant '
        'demand, though local tenant demand is largely employment-driven rather than commuter-driven.',
      ),
      (
        'Price ceiling relative to Melbourne',
        "Bendigo's price growth is partly constrained by local income levels. Unlike markets with "
        'direct Melbourne pricing arbitrage, growth here is driven by local wage growth and '
        'serviceability rather than capital city proximity repricing.',
      ),
    ],
    lukes_p1=(
      'Bendigo is a city that often gets overlooked because it doesn\'t have the single dramatic '
      'catalyst — a fast rail announcement or a defence base. But what it does have is '
      'something arguably more durable: a diversified, stable employment base, a fully functional '
      'urban environment, and a yield profile that I find genuinely compelling for investors '
      'focused on income.'
    ),
    lukes_p2=(
      'The selectivity here is around property type and location within the city. Not all of '
      'Bendigo tells the same story — what I focus on is the established inner ring, close '
      'to healthcare and education employment, where rental demand is structural rather than '
      'cyclical. That\'s where the strongest long-term hold case exists.'
    ),
    map_center=[-36.758, 144.282],
    map_zoom=12,
    map_pts=[
      dict(latlng=[-36.758, 144.282], label='Bendigo CBD',       color='#bd7a70', perm=True),
      dict(latlng=[-36.772, 144.311], label='La Trobe University', color='#cf9b92', perm=False),
      dict(latlng=[-36.755, 144.278], label='Bendigo Hospital',  color='#cf9b92', perm=False),
      dict(latlng=[-36.726, 144.258], label='Bendigo Airport',   color='#cf9b92', perm=False),
    ],
    map_line=None,
    lga_name='Greater Bendigo LGA',
    heroPrice='~$470k', heroYield='5–7%', heroPopulation='120k', heroVacancy='0.7%',
    houseMedian=470000, unitMedian=295000,
    houseRentRange='$380–$460', unitRentRange='$290–$360',
    houseYieldRange='5.0–6.0%', unitYieldRange='6.0–7.2%',
    vacancyRate=0.7, daysOnMarket=24, clearanceRate=62, propertiesListed=680,
    popTotal=120000, popGrowth=1.8, medianAge=38, ownerOccupier=64, employed=62, unemployment=4.5,
    conditions=[
      ('Rental demand',              'High',     78),
      ('Stock on market',            'Low',      25),
      ('Buyer competition',          'Moderate', 62),
      ('Infrastructure pipeline',    'High',     78),
      ('Population growth momentum', 'Moderate', 65),
    ],
    housePerf=[('1 year', 3.8, 38), ('3 years', 8.5, 85), ('5 years', 9.8, 98), ('10 years', 7.2, 72)],
    unitPerf= [('1 year', 2.8, 28), ('3 years', 6.8, 68), ('5 years', 7.8, 78), ('10 years', 5.5, 55)],
    data_sources=(
      'ABS Regional Population &amp; Census &nbsp;&middot;&nbsp; Infrastructure Australia Pipeline '
      '&nbsp;&middot;&nbsp; Victorian Government Major Projects Register &nbsp;&middot;&nbsp; '
      'SQM Research &nbsp;&middot;&nbsp; CoreLogic / Suburbtrends &nbsp;&middot;&nbsp; '
      'Greater Bendigo City Council &nbsp;&middot;&nbsp; Map data &copy; OpenStreetMap contributors'
    ),
  ),

  # ── 3. LARA ─────────────────────────────────────────────────────────────────
  dict(
    filename='lara.html',
    key='lara',
    city='Lara',
    state_badge='Victoria',
    subtitle='Strategic mid-corridor growth suburb · 50km from Melbourne CBD · City of Greater Geelong',
    loc_stats=[
      ('50km',   'Melbourne CBD'),
      ('~45min', 'V/Line (Geelong line)'),
      ('20km',   'Geelong CBD'),
      ('10km',   'Avalon Airport'),
    ],
    loc_copy=(
      'Lara sits in the strategic corridor between Melbourne and Geelong, offering residents access '
      'to two major employment markets within one commute. The suburb is served by V/Line\'s Geelong '
      'line and sits directly on the Princes Freeway, with Avalon Airport just 10km away — '
      'a significant and growing logistics and travel hub. As both Melbourne\'s western fringe and '
      'Geelong\'s northern boundary continue to grow, Lara\'s location becomes progressively more '
      'central rather than peripheral.'
    ),
    education=[
      'Lara Secondary College',
      'Lara Primary School',
      "St Anthony's Primary School",
      'Heathdale Christian College (Werribee)',
    ],
    healthcare=[
      'Lara Medical Centre',
      'Barwon Health (Geelong, 20km)',
      'Western Health services (Melbourne corridor)',
      'Local GP and allied health network',
    ],
    retail=[
      'Lara Village Shopping Centre',
      'Lara Town Centre retail',
      'Geelong CBD (20km)',
      'Pacific Werribee (45km)',
    ],
    transport=[
      'V/Line Geelong line (45min to Melbourne)',
      'Princes Freeway (Melbourne &amp; Geelong)',
      'Avalon Airport (10km)',
      'Local bus connections',
    ],
    infra_total='$300M+',
    infra_cards=[
      dict(
        value='$200M+',
        title='Avalon Airport Expansion',
        desc='Significant ongoing terminal, runway and logistics investment positioning Avalon as Victoria\'s second major airport and a growing regional employment hub. Directly impacts land and rental values across the Lara corridor.',
        status='Active',
      ),
      dict(
        value='TBC',
        title='Lara Growth Area Plan',
        desc='City of Greater Geelong structure planning for expanded residential development, services and open space in Lara\'s growth corridors, supporting population growth in a strategically located suburb.',
        status='Under development',
      ),
      dict(
        value='$100M+',
        title='Geelong Ring Road Extensions',
        desc='VicRoads planning for improved ring road connectivity reducing travel times between Lara, Geelong and the Princes Freeway corridor — strengthening Lara\'s dual-market accessibility.',
        status='Planning approved',
      ),
    ],
    macro_copy=(
      "Lara's population is growing rapidly as the suburb attracts both Melbourne commuters and "
      'Geelong workers priced out of established suburbs. The demographic skews toward young families '
      'and owner-occupiers, creating a stable rental tenant base of families in transition between '
      'renting and buying. Rental vacancy is structurally low due to the suburb\'s desirability '
      'and limited rental stock relative to population growth.'
    ),
    macro_copy_p2=(
      'As both Melbourne\'s south-western fringe and Geelong\'s northern boundary continue to '
      'expand, Lara\'s position — currently at the edge of each city\'s orbit — '
      'is progressively shifting toward being genuinely central to the combined corridor.'
    ),
    comparable_text=(
      "Lara's dual-market access position — sitting in the growth corridor between two major "
      'employment centres — shares characteristics with other strategic corridor markets such '
      'as Werribee and Wyndham Vale at earlier stages of their growth cycles. Past performance '
      'in those markets is not a guide to future performance in Lara.'
    ),
    affordability_text=(
      'At ~$620k median, Lara offers Melbourne employment access at a meaningful discount to '
      "Melbourne's median — while also offering Geelong employment access. The suburb's "
      'strategic position between two cities creates a demand dynamic that is distinct from '
      'single-endpoint corridor properties.'
    ),
    investment_intro=(
      'Lara represents one of the most interesting dual-market opportunities in Victoria — '
      'genuine access to both Melbourne and Geelong employment at a price point that still '
      'offers meaningful yield and a long-term growth case driven by progressive centrality.'
    ),
    tags=[
      'Dual Melbourne/Geelong employment access',
      'Strategic corridor, progressively more central',
      'Strong family rental demand, low vacancy',
      'Affordable relative to both city endpoints',
      'Buy, hold and benefit from Avalon Airport growth',
      'Long-term capital growth compounding',
    ],
    entry_house='$560k–$720k+',
    entry_unit='$350k–$470k+',
    risks=[
      (
        'New supply within growth areas',
        'Lara has identified growth corridors where new residential development is occurring. '
        'Monitor new-build supply in the outer growth areas; established Lara has more limited '
        'land availability and is more insulated from new supply pressure.',
      ),
      (
        'Dual-market dependency',
        'Values are partly supported by access to both Melbourne and Geelong employment. Any '
        'structural change to commuting patterns or employment growth in either city could affect '
        'demand, though the rental market is supported by strong local family demand.',
      ),
      (
        'Avalon Airport timeline uncertainty',
        "The airport's growth is commercially driven and subject to airline route economics. "
        'Delay in anticipated growth reduces one of the key demand drivers for the corridor, '
        'though the V/Line and Princes Freeway connectivity remain unchanged.',
      ),
    ],
    lukes_p1=(
      'Lara is a market I find genuinely interesting because of its geography — it\'s not '
      'really part of either Melbourne\'s or Geelong\'s orbit exclusively, which means it benefits '
      'from both without being fully priced into either. That structural advantage often gets '
      'missed in market analysis that focuses on single-city proximity.'
    ),
    lukes_p2=(
      'Selectivity here matters more than most markets. The growth area fringe and the established '
      'town centre tell very different stories in terms of rental demand quality and capital growth '
      'trajectory. The right asset in the right part of Lara, with dual-market appeal, can be '
      'a very strong long-term hold.'
    ),
    map_center=[-38.020, 144.400],
    map_zoom=11,
    map_pts=[
      dict(latlng=[-38.020, 144.400], label='Lara',          color='#bd7a70', perm=True),
      dict(latlng=[-38.147, 144.360], label='Geelong CBD',   color='#cf9b92', perm=True),
      dict(latlng=[-37.975, 144.469], label='Avalon Airport',color='#cf9b92', perm=False),
      dict(latlng=[-37.814, 144.963], label='Melbourne CBD', color='#cf9b92', perm=False),
    ],
    map_line=([-37.814, 144.963], [-38.147, 144.360]),
    lga_name='City of Greater Geelong',
    heroPrice='~$620k', heroYield='4.5–5.5%', heroPopulation='23k', heroVacancy='0.6%',
    houseMedian=620000, unitMedian=390000,
    houseRentRange='$430–$510', unitRentRange='$340–$410',
    houseYieldRange='4.5–5.2%', unitYieldRange='5.2–6.0%',
    vacancyRate=0.6, daysOnMarket=22, clearanceRate=66, propertiesListed=180,
    popTotal=23000, popGrowth=2.8, medianAge=34, ownerOccupier=74, employed=66, unemployment=3.6,
    conditions=[
      ('Rental demand',              'Very High', 90),
      ('Stock on market',            'Very Low',  15),
      ('Buyer competition',          'High',      82),
      ('Infrastructure pipeline',    'High',      75),
      ('Population growth momentum', 'Very High', 90),
    ],
    housePerf=[('1 year', 4.0, 40), ('3 years', 9.0, 90), ('5 years', 10.2, 100), ('10 years', 7.8, 78)],
    unitPerf= [('1 year', 3.0, 30), ('3 years', 7.0, 70), ('5 years', 7.8,  78), ('10 years', 5.8, 58)],
    data_sources=(
      'ABS Regional Population &amp; Census &nbsp;&middot;&nbsp; Infrastructure Australia Pipeline '
      '&nbsp;&middot;&nbsp; Victorian Government Major Projects Register &nbsp;&middot;&nbsp; '
      'SQM Research &nbsp;&middot;&nbsp; CoreLogic / Suburbtrends &nbsp;&middot;&nbsp; '
      'City of Greater Geelong &nbsp;&middot;&nbsp; Map data &copy; OpenStreetMap contributors'
    ),
  ),

]

# ─── HTML GENERATION ─────────────────────────────────────────────────────────

def infra_status_class(status):
    s = status.lower()
    if any(x in s for x in ['construction', 'active', 'operational', 'complete']):
        return 'status-active'
    if any(x in s for x in ['approved', 'committed', 'development']):
        return 'status-approved'
    return 'status-proposed'

def pop_counter_attrs(pop_total):
    if pop_total >= 1000000:
        return f'data-target="{pop_total/1000000:.1f}" data-prefix="" data-suffix="M" data-decimal="1"'
    return f'data-target="{pop_total}" data-prefix="" data-suffix="k" data-divisor="1000"'

def map_pts_js(pts):
    lines = ['const pts = [']
    for p in pts:
        lat, lng = p['latlng']
        perm = 'true' if p.get('perm') else 'false'
        lines.append(f"  {{ latlng: [{lat}, {lng}], label: '{p['label']}', color: '{p['color']}', perm: {perm} }},")
    lines.append('];')
    return '\n'.join(lines)

def map_line_js(line):
    if not line:
        return ''
    (lat1, lng1), (lat2, lng2) = line
    return (
        f"L.polyline([[{lat1}, {lng1}], [{lat2}, {lng2}]], {{\n"
        f"  color: 'rgba(189,122,112,0.5)', weight: 2, dashArray: '6 5',\n"
        f"}}).addTo(map);"
    )

def build_loc_stat_panels(stats):
    out = ''
    for val, label in stats:
        out += (
            f'\n        <div style="background:rgba(247,243,237,0.05);border:1px solid rgba(247,243,237,0.09);border-radius:14px;padding:18px 20px;">'
            f'\n          <p style="font-family:\'Fraunces\',serif;font-size:26px;font-weight:400;color:#bd7a70;">{val}</p>'
            f'\n          <p style="font-size:13px;font-weight:300;color:rgba(247,243,237,0.5);margin-top:4px;">{label}</p>'
            f'\n        </div>'
        )
    return out

def build_amenity_card(cat, items):
    items_html = ''
    for item in items:
        items_html += (
            f'\n        <div class="amenity-item"><div class="amenity-dot"></div>'
            f'<span style="font-size:13.5px;font-weight:300;color:rgba(247,243,237,0.7);">{item}</span></div>'
        )
    return (
        f'\n      <div style="background:rgba(247,243,237,0.05);border:1px solid rgba(247,243,237,0.09);border-radius:14px;padding:22px 20px;">'
        f'\n        <p class="amenity-cat">{cat}</p>'
        f'{items_html}'
        f'\n      </div>'
    )

def build_infra_cards(cards):
    out = ''
    for c in cards:
        sc = infra_status_class(c['status'])
        out += (
            f'\n      <div class="infra-card reveal">'
            f'\n        <div class="infra-value">{c["value"]}</div>'
            f'\n        <h3 style="font-size:16px;font-weight:600;color:#f7f3ed;margin-bottom:8px;">{c["title"]}</h3>'
            f'\n        <p style="font-size:14px;font-weight:300;color:rgba(247,243,237,0.55);line-height:1.65;">{c["desc"]}</p>'
            f'\n        <div class="infra-status {sc}">&#9679; {c["status"]}</div>'
            f'\n      </div>'
        )
    return out

def build_conditions(conds):
    out = ''
    for label, val_label, pct in conds:
        out += (
            f'\n          <div>'
            f'\n            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">'
            f'\n              <span style="font-size:14px;font-weight:500;color:#22201d;">{label}</span>'
            f'\n              <span style="font-size:13px;font-weight:600;color:#bd7a70;">{val_label}</span>'
            f'\n            </div>'
            f'\n            <div style="background:rgba(34,32,29,0.08);border-radius:100px;height:6px;">'
            f'<div style="width:{pct}%;height:6px;border-radius:100px;background:linear-gradient(90deg,#bd7a70,#cf9b92);"></div></div>'
            f'\n          </div>'
        )
    return out

def build_perf_rows(perf, color):
    out = ''
    for i, (period, val, bar) in enumerate(perf):
        suffix = '' if i == 0 else ' p.a.'
        border = '' if i == len(perf) - 1 else 'border-bottom:1px solid rgba(34,32,29,0.06);'
        out += (
            f'\n          <div class="perf-row" style="padding:15px 22px;{border}">'
            f'\n            <span style="font-size:13.5px;font-weight:500;color:rgba(34,32,29,0.55);">{period}</span>'
            f'\n            <div style="background:rgba(34,32,29,0.06);border-radius:100px;height:5px;">'
            f'<div class="perf-bar" style="width:0%;background:{color};" data-width="{bar}%"></div></div>'
            f'\n            <span style="font-size:14px;font-weight:600;color:#22201d;text-align:right;">{val}%{suffix}</span>'
            f'\n          </div>'
        )
    return out

def build_tags(tags):
    return '\n          '.join(
        f'<span class="profile-tag"><span class="dot"></span>{t}</span>'
        for t in tags
    )

def build_risks(risks):
    colors = ['#bd7a70', '#cf9b92', 'rgba(189,122,112,0.5)']
    out = ''
    for i, (title, desc) in enumerate(risks):
        out += (
            f'\n      <div class="risk-item" style="border-color:rgba(247,243,237,0.08);">'
            f'\n        <div class="risk-dot" style="background:{colors[i % len(colors)]};"></div>'
            f'\n        <div>'
            f'\n          <p style="font-size:16px;font-weight:500;color:#f7f3ed;margin-bottom:6px;">{title}</p>'
            f'\n          <p style="font-size:15px;font-weight:300;color:rgba(247,243,237,0.55);line-height:1.7;">{desc}</p>'
            f'\n        </div>'
            f'\n      </div>'
        )
    return out

CSS = """    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    html{scroll-behavior:smooth;overflow-x:hidden;}
    body{font-family:'Outfit',sans-serif;font-weight:300;color:#22201d;background:#f7f3ed;-webkit-font-smoothing:antialiased;overflow-x:hidden;}
    ::selection{background:#bd7a70;color:#f7f3ed}
    a{color:inherit;text-decoration:none}
    .reveal{opacity:0;transform:translateY(28px);transition:opacity .7s ease,transform .7s ease;}
    .reveal.visible{opacity:1;transform:translateY(0);}
    .reveal-left{opacity:0;transform:translateX(-28px);transition:opacity .7s ease,transform .7s ease;}
    .reveal-left.visible{opacity:1;transform:translateX(0);}
    .reveal-scale{opacity:0;transform:scale(0.94);transition:opacity .6s ease,transform .6s ease;}
    .reveal-scale.visible{opacity:1;transform:scale(1);}
    .stat-val{font-family:'Fraunces',serif;font-size:48px;font-weight:400;line-height:1;letter-spacing:-1px;}
    .stat-label{font-size:12px;font-weight:500;letter-spacing:0.12em;text-transform:uppercase;margin-top:6px;opacity:0.5;}
    .sec{padding:88px 44px;}
    .sec-dark{background:#22201d;color:#f7f3ed;}
    .sec-deeper{background:#1a1916;color:#f7f3ed;}
    .sec-cream{background:#f7f3ed;}
    .sec-warm{background:#ede8e0;}
    .inner{max-width:1060px;margin:0 auto;}
    .eyebrow{font-size:11.5px;font-weight:500;letter-spacing:0.14em;text-transform:uppercase;color:#bd7a70;margin-bottom:14px;}
    .sec-h2{font-family:'Fraunces',serif;font-size:38px;font-weight:400;line-height:1.2;letter-spacing:-0.3px;margin-bottom:40px;}
    .infra-card{background:rgba(247,243,237,0.05);border:1px solid rgba(247,243,237,0.09);border-radius:16px;padding:28px 26px;}
    .infra-value{font-family:'Fraunces',serif;font-size:28px;font-weight:400;color:#bd7a70;margin-bottom:4px;}
    .infra-status{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:500;letter-spacing:0.1em;text-transform:uppercase;padding:4px 10px;border-radius:100px;margin-top:10px;}
    .status-active{background:rgba(189,122,112,0.2);color:#bd7a70;}
    .status-approved{background:rgba(207,155,146,0.15);color:#cf9b92;}
    .status-proposed{background:rgba(247,243,237,0.08);color:rgba(247,243,237,0.5);}
    .chart-wrap{position:relative;height:260px;}
    .risk-item{display:flex;align-items:flex-start;gap:16px;padding:22px 0;border-bottom:1px solid rgba(34,32,29,0.08);}
    .risk-item:last-child{border-bottom:none;}
    .risk-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0;margin-top:5px;}
    .profile-tag{display:inline-flex;align-items:center;gap:8px;background:#fff;border:1px solid rgba(34,32,29,0.08);border-radius:100px;padding:9px 18px;font-size:14px;font-weight:400;color:#22201d;}
    .profile-tag .dot{width:8px;height:8px;border-radius:50%;background:#bd7a70;flex-shrink:0;}
    .perf-row{display:grid;grid-template-columns:120px 1fr 1fr;align-items:center;gap:0;padding:18px 0;border-bottom:1px solid rgba(247,243,237,0.07);}
    .perf-bar{height:6px;border-radius:3px;background:#bd7a70;transition:width 1.2s cubic-bezier(0.4,0,0.2,1);}
    .static-map-wrap{position:relative;border-radius:16px;overflow:hidden;border:1px solid rgba(247,243,237,0.08);}
    #map{height:400px;display:block;pointer-events:none;}
    .leaflet-container{font-family:'Outfit',sans-serif;}
    .fw-tip{background:#1a1916!important;border:1px solid rgba(189,122,112,0.45)!important;color:#f7f3ed!important;font-family:'Outfit',sans-serif!important;font-size:12px!important;font-weight:500!important;padding:5px 12px!important;border-radius:6px!important;box-shadow:0 4px 16px rgba(0,0,0,0.5)!important;white-space:nowrap!important;}
    .fw-tip::before,.fw-tip.leaflet-tooltip-bottom::before,.fw-tip.leaflet-tooltip-top::before{display:none!important;}
    .amenity-cat{font-size:11px;font-weight:500;letter-spacing:0.12em;text-transform:uppercase;color:#bd7a70;margin-bottom:10px;}
    .amenity-item{display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid rgba(247,243,237,0.07);}
    .amenity-item:last-child{border-bottom:none;}
    .amenity-dot{width:6px;height:6px;border-radius:50%;background:#bd7a70;flex-shrink:0;}
    nav{position:sticky;top:0;z-index:200;background:#22201d;border-bottom:1px solid rgba(247,243,237,0.08);}
    .nav-inner{max-width:1200px;margin:0 auto;padding:18px 44px;display:flex;align-items:center;justify-content:space-between;gap:24px;}
    .hero{min-height:68vh;background:linear-gradient(160deg,#1a1916 0%,#22201d 55%,#2a2420 100%);display:flex;flex-direction:column;justify-content:flex-end;position:relative;overflow:hidden;}
    .hero-bg-lines{position:absolute;inset:0;opacity:0.04;background-image:repeating-linear-gradient(0deg,transparent,transparent 60px,rgba(247,243,237,0.8) 60px,rgba(247,243,237,0.8) 61px),repeating-linear-gradient(90deg,transparent,transparent 60px,rgba(247,243,237,0.8) 60px,rgba(247,243,237,0.8) 61px);}
    .hero-content{position:relative;z-index:2;padding:60px 44px 0;}
    .hero-stats-strip{border-top:1px solid rgba(247,243,237,0.1);margin-top:48px;display:grid;grid-template-columns:repeat(4,1fr);background:rgba(0,0,0,0.25);backdrop-filter:blur(8px);}
    .hero-stat{padding:22px 28px;border-right:1px solid rgba(247,243,237,0.08);}
    .hero-stat:last-child{border-right:none;}
    .hero-stat-val{font-family:'Fraunces',serif;font-size:26px;font-weight:400;color:#f7f3ed;line-height:1;}
    .hero-stat-label{font-size:11px;font-weight:400;letter-spacing:0.1em;text-transform:uppercase;color:rgba(247,243,237,0.4);margin-top:5px;}
    .data-note{font-size:11.5px;font-weight:300;color:rgba(34,32,29,0.35);margin-top:10px;line-height:1.6;}
    .data-note-light{font-size:11.5px;font-weight:300;color:rgba(247,243,237,0.3);margin-top:10px;line-height:1.6;}
    .lukes-take-card{background:rgba(247,243,237,0.05);border:1px solid rgba(247,243,237,0.09);border-radius:20px;padding:40px;}
    .nav-area-label{display:inline;}
    @media(max-width:760px){
      .nav-area-label{display:none;}
      .sec{padding:60px 20px;}
      .nav-inner{padding:14px 20px;}
      .hero-content{padding:0 20px;}
      .hero-stats-strip{grid-template-columns:1fr 1fr;}
      .sec-h2{font-size:28px;}
      .stat-val{font-size:34px;}
      .r-2col{grid-template-columns:1fr!important;}
      .r-3col{grid-template-columns:1fr!important;}
      .r-4col{grid-template-columns:1fr 1fr!important;}
      .perf-row{grid-template-columns:80px 1fr 1fr;}
      #map{height:260px!important;}
      h1{font-size:48px!important;letter-spacing:-1px!important;}
      .chart-wrap{height:220px;}
      .infra-card{padding:20px 18px;}
    }
    @media(max-width:400px){
      .r-4col{grid-template-columns:1fr!important;}
      .hero-stats-strip{grid-template-columns:1fr 1fr;}
    }"""

JS_CHARTS_AND_MAP = """
const D = window.MARKETS['{key}'];
const COPPER = '#bd7a70';
const COPPER_LIGHT = '#cf9b92';
const COPPER_ALPHA = 'rgba(189,122,112,0.15)';
const DARK_GRID = 'rgba(247,243,237,0.07)';
const LIGHT_GRID = 'rgba(34,32,29,0.07)';
const DARK_TICK = 'rgba(247,243,237,0.35)';
const LIGHT_TICK = 'rgba(34,32,29,0.4)';

Chart.defaults.font.family = "'Outfit', sans-serif";
Chart.defaults.font.weight = '300';

function lineChart(id, labels, datasets, darkBg) {{
  const grid = darkBg ? DARK_GRID : LIGHT_GRID;
  const tick = darkBg ? DARK_TICK : LIGHT_TICK;
  return new Chart(document.getElementById(id), {{
    type: 'line', data: {{ labels, datasets }},
    options: {{
      responsive: true, maintainAspectRatio: false,
      animation: {{ duration: 1200, easing: 'easeInOutQuart' }},
      plugins: {{ legend: {{ display: datasets.length > 1, labels: {{ color: tick, font: {{ size: 12 }}, boxWidth: 12, padding: 16 }} }}, tooltip: {{ backgroundColor: '#22201d', titleColor: '#f7f3ed', bodyColor: 'rgba(247,243,237,0.65)', padding: 12, cornerRadius: 8 }} }},
      scales: {{ x: {{ grid: {{ color: grid }}, ticks: {{ color: tick, font: {{ size: 11 }} }} }}, y: {{ grid: {{ color: grid }}, ticks: {{ color: tick, font: {{ size: 11 }} }} }} }}
    }}
  }});
}}

function barChart(id, labels, data, darkBg) {{
  const grid = darkBg ? DARK_GRID : LIGHT_GRID;
  const tick = darkBg ? DARK_TICK : LIGHT_TICK;
  return new Chart(document.getElementById(id), {{
    type: 'bar', data: {{ labels, datasets: [{{ data, backgroundColor: COPPER_ALPHA, borderColor: COPPER, borderWidth: 1.5, borderRadius: 4 }}] }},
    options: {{
      responsive: true, maintainAspectRatio: false,
      animation: {{ duration: 1200, easing: 'easeInOutQuart' }},
      plugins: {{ legend: {{ display: false }}, tooltip: {{ backgroundColor: '#22201d', titleColor: '#f7f3ed', bodyColor: 'rgba(247,243,237,0.65)', padding: 12, cornerRadius: 8 }} }},
      scales: {{ x: {{ grid: {{ color: grid }}, ticks: {{ color: tick, font: {{ size: 11 }} }} }}, y: {{ grid: {{ color: grid }}, ticks: {{ color: tick, font: {{ size: 11 }} }} }} }}
    }}
  }});
}}

const observer = new IntersectionObserver((entries) => {{
  entries.forEach(el => {{
    if (el.isIntersecting) {{
      el.target.classList.add('visible');
      if (el.target.querySelector && el.target.querySelector('[data-target]'))
        el.target.querySelectorAll('[data-target]').forEach(animateCounter);
      if (el.target.hasAttribute('data-target')) animateCounter(el.target);
      el.target.querySelectorAll && el.target.querySelectorAll('.perf-bar[data-width]').forEach(bar => {{
        setTimeout(() => bar.style.width = bar.dataset.width, 200);
      }});
    }}
  }});
}}, {{ threshold: 0.15 }});

document.querySelectorAll('.reveal, .reveal-left, .reveal-scale').forEach(el => observer.observe(el));

function animateCounter(el) {{
  if (el.dataset.animated) return;
  el.dataset.animated = '1';
  const target = parseFloat(el.dataset.target);
  const prefix = el.dataset.prefix || '';
  const suffix = el.dataset.suffix || '';
  const decimal = parseInt(el.dataset.decimal || 0);
  const isPrice = el.dataset.format === 'price';
  const divisor = parseFloat(el.dataset.divisor || 1);
  const duration = 1400, start = performance.now();
  function fmt(val) {{
    val = val / divisor;
    if (isPrice) {{
      if (val >= 1000000) return prefix + (val/1000000).toFixed(1) + 'M';
      if (val >= 1000) return prefix + Math.round(val/1000) + 'k';
      return prefix + Math.round(val) + suffix;
    }}
    return prefix + (decimal ? val.toFixed(decimal) : Math.round(val)) + suffix;
  }}
  function step(now) {{
    const p = Math.min((now - start) / duration, 1);
    el.textContent = fmt(target * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(step); else el.textContent = fmt(target);
  }}
  requestAnimationFrame(step);
}}

document.querySelectorAll('[data-target]').forEach(el => observer.observe(el));

const chartObserver = new IntersectionObserver((entries) => {{
  entries.forEach(e => {{
    if (e.isIntersecting && !e.target._chartDone) {{
      e.target._chartDone = true;
      const id = e.target.id;
      if (id === 'popChart') lineChart('popChart', D.popYears, [{{ label: 'Population', data: D.population, borderColor: COPPER, backgroundColor: COPPER_ALPHA, tension: 0.4, fill: true, pointRadius: 3, pointBackgroundColor: COPPER }}], false);
      if (id === 'priceChart') lineChart('priceChart', D.priceYears, [
        {{ label: 'Houses', data: D.housePrice, borderColor: COPPER, backgroundColor: COPPER_ALPHA, tension: 0.4, fill: true, pointRadius: 3, pointBackgroundColor: COPPER }},
        {{ label: 'Units', data: D.unitPrice, borderColor: COPPER_LIGHT, backgroundColor: 'rgba(207,155,146,0.08)', tension: 0.4, fill: true, borderDash: [5,3], pointRadius: 3, pointBackgroundColor: COPPER_LIGHT }}
      ], false);
      if (id === 'yieldChart') lineChart('yieldChart', D.yieldYears, [
        {{ label: 'Houses', data: D.yieldHouse, borderColor: COPPER, backgroundColor: COPPER_ALPHA, tension: 0.4, fill: true, pointRadius: 3, pointBackgroundColor: COPPER }},
        {{ label: 'Units', data: D.yieldUnit, borderColor: COPPER_LIGHT, backgroundColor: 'rgba(207,155,146,0.08)', tension: 0.4, fill: false, borderDash: [5,3], pointRadius: 3, pointBackgroundColor: COPPER_LIGHT }}
      ], false);
      if (id === 'vacancyChart') lineChart('vacancyChart', D.vacYears, [{{ label: 'Vacancy %', data: D.vacancy, borderColor: COPPER, backgroundColor: COPPER_ALPHA, tension: 0.4, fill: true, pointRadius: 3, pointBackgroundColor: COPPER }}], true);
      if (id === 'stockChart') barChart('stockChart', D.stockMonths, D.stockVals, true);
    }}
  }});
}}, {{ threshold: 0.2 }});

document.querySelectorAll('canvas').forEach(c => chartObserver.observe(c));

const map = L.map('map', {{
  center: [{lat}, {lng}], zoom: {zoom},
  zoomControl: false, dragging: false, scrollWheelZoom: false,
  doubleClickZoom: false, touchZoom: false, tap: false,
  keyboard: false, attributionControl: false,
}});
L.tileLayer('https://{{s}}.basemaps.cartocdn.com/dark_all/{{z}}/{{x}}/{{y}}{{r}}.png', {{
  subdomains: 'abcd', maxZoom: 19,
}}).addTo(map);
function mkIcon(color) {{
  return L.divIcon({{
    html: `<div style="width:11px;height:11px;border-radius:50%;background:${{color}};border:2px solid rgba(247,243,237,0.7);box-shadow:0 2px 10px rgba(0,0,0,0.6);"></div>`,
    className: '', iconAnchor: [6, 6],
  }});
}}
{pts_js}
pts.forEach(p => {{
  L.marker(p.latlng, {{ icon: mkIcon(p.color) }}).addTo(map)
    .bindTooltip(p.label, {{ permanent: p.perm, direction: 'top', offset: [0,-10], className: 'fw-tip' }});
}});
{line_js}"""


def generate_html(m):
    lat, lng = m['map_center']
    zoom = m['map_zoom']
    pts_js = map_pts_js(m['map_pts'])
    line_js = map_line_js(m.get('map_line'))

    macro_p2_html = ''
    if m.get('macro_copy_p2'):
        macro_p2_html = (
            f'<p style="font-size:16px;font-weight:300;line-height:1.8;color:rgba(34,32,29,0.7);">'
            f'{m["macro_copy_p2"]}</p>'
        )

    js = JS_CHARTS_AND_MAP.format(
        key=m['key'],
        lat=lat, lng=lng, zoom=zoom,
        pts_js=pts_js,
        line_js=line_js,
    )

    loc_panels = build_loc_stat_panels(m['loc_stats'])
    amenities = (
        build_amenity_card('Education', m['education']) +
        build_amenity_card('Healthcare', m['healthcare']) +
        build_amenity_card('Retail &amp; dining', m['retail']) +
        build_amenity_card('Transport &amp; lifestyle', m['transport'])
    )
    infra_html = build_infra_cards(m['infra_cards'])
    conds_html = build_conditions(m['conditions'])
    h_perf = build_perf_rows(m['housePerf'], '#bd7a70')
    u_perf = build_perf_rows(m['unitPerf'], '#cf9b92')
    tags_html = build_tags(m['tags'])
    risks_html = build_risks(m['risks'])
    pop_attrs = pop_counter_attrs(m['popTotal'])

    page = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{m['city']} Area Report — Fairway Investing</title>
  <meta name="robots" content="noindex, nofollow">
  <link rel="icon" type="image/png" href="/logo-icon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,400;1,9..144,500;1,9..144,600&family=Outfit:wght@300;400;500;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script src="/data/markets.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
{CSS}
  </style>
</head>
<body>

<nav>
  <div class="nav-inner">
    <a href="/" style="display:flex;align-items:center;gap:12px;">
      <img src="/logo-icon.png" alt="" style="height:32px;width:auto;">
      <img src="/logo-word.png" alt="Fairway Investing" style="height:22px;width:auto;">
    </a>
    <div style="display:flex;align-items:center;gap:24px;">
      <span class="nav-area-label" style="font-size:12px;font-weight:500;letter-spacing:0.1em;text-transform:uppercase;color:rgba(247,243,237,0.35);">Area Report</span>
      <a href="/" style="font-size:13.5px;color:rgba(247,243,237,0.4);transition:color .2s;" onmouseover="this.style.color='rgba(247,243,237,0.75)'" onmouseout="this.style.color='rgba(247,243,237,0.4)'">&larr; Back to home</a>
    </div>
  </div>
</nav>

<section class="hero">
  <div class="hero-bg-lines"></div>
  <div class="hero-content">
    <div style="max-width:1060px;margin:0 auto;">
      <div class="reveal" style="display:inline-flex;align-items:center;gap:8px;background:rgba(189,122,112,0.15);border:1px solid rgba(189,122,112,0.3);border-radius:100px;padding:6px 16px;margin-bottom:24px;">
        <span style="width:7px;height:7px;border-radius:50%;background:#bd7a70;display:block;flex-shrink:0;"></span>
        <span style="font-size:11.5px;font-weight:500;color:#bd7a70;letter-spacing:0.9px;text-transform:uppercase;">Fairway Area Report &nbsp;&middot;&nbsp; {m['state_badge']}</span>
      </div>
      <h1 class="reveal" style="font-family:'Fraunces',serif;font-size:72px;font-weight:400;color:#f7f3ed;line-height:1.05;letter-spacing:-2px;margin-bottom:16px;">{m['city']}</h1>
      <p class="reveal" style="font-size:18px;font-weight:300;color:rgba(247,243,237,0.55);max-width:580px;line-height:1.7;margin-bottom:14px;">{m['subtitle']}</p>
      <p class="reveal" style="font-size:15px;font-weight:300;color:rgba(247,243,237,0.3);max-width:560px;line-height:1.8;">A Fairway Investing research report — produced for client use to provide market context across key growth indicators, infrastructure pipeline and supply &amp; demand dynamics.</p>
    </div>
  </div>
  <div class="hero-stats-strip">
    <div style="max-width:1060px;margin:0 auto;display:contents;">
      <div class="hero-stat reveal">
        <div class="hero-stat-val">{m['heroPrice']}</div>
        <div class="hero-stat-label">Approx. house median</div>
      </div>
      <div class="hero-stat reveal">
        <div class="hero-stat-val">{m['heroYield']}</div>
        <div class="hero-stat-label">Indicative gross yield</div>
      </div>
      <div class="hero-stat reveal">
        <div class="hero-stat-val">{m['heroPopulation']}</div>
        <div class="hero-stat-label">Population</div>
      </div>
      <div class="hero-stat reveal">
        <div class="hero-stat-val">{m['heroVacancy']}</div>
        <div class="hero-stat-label">Vacancy rate</div>
      </div>
    </div>
  </div>
</section>

<section class="sec sec-dark">
  <div class="inner">
    <p class="eyebrow reveal">Location</p>
    <h2 class="sec-h2 reveal" style="color:#f7f3ed;">Where is {m['city']}?</h2>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:52px;align-items:start;margin-bottom:44px;" class="r-2col reveal">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;">{loc_panels}
      </div>
      <div>
        <p style="font-size:15.5px;font-weight:300;color:rgba(247,243,237,0.55);line-height:1.85;">{m['loc_copy']}</p>
      </div>
    </div>
    <div class="static-map-wrap reveal-scale" style="margin-bottom:36px;">
      <div id="map"></div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;" class="r-4col reveal">{amenities}
    </div>
  </div>
</section>

<section class="sec sec-cream">
  <div class="inner">
    <p class="eyebrow reveal">Macro snapshot</p>
    <h2 class="sec-h2 reveal">Population &amp; demographics</h2>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:24px;margin-bottom:56px;" class="r-4col reveal">
      <div style="padding:28px 24px;background:#fff;border-radius:16px;border:1px solid rgba(34,32,29,0.07);box-shadow:0 2px 16px rgba(34,32,29,0.04);">
        <div class="stat-val" {pop_attrs}>0</div>
        <div class="stat-label">Population</div>
      </div>
      <div style="padding:28px 24px;background:#fff;border-radius:16px;border:1px solid rgba(34,32,29,0.07);box-shadow:0 2px 16px rgba(34,32,29,0.04);">
        <div class="stat-val" data-target="{m['popGrowth']}" data-prefix="" data-suffix="%" data-decimal="1">0</div>
        <div class="stat-label">Annual pop. growth</div>
      </div>
      <div style="padding:28px 24px;background:#fff;border-radius:16px;border:1px solid rgba(34,32,29,0.07);box-shadow:0 2px 16px rgba(34,32,29,0.04);">
        <div class="stat-val" data-target="{m['medianAge']}" data-prefix="" data-suffix="">0</div>
        <div class="stat-label">Median age</div>
      </div>
      <div style="padding:28px 24px;background:#fff;border-radius:16px;border:1px solid rgba(34,32,29,0.07);box-shadow:0 2px 16px rgba(34,32,29,0.04);">
        <div class="stat-val" data-target="{m['ownerOccupier']}" data-prefix="" data-suffix="%">0</div>
        <div class="stat-label">Owner-occupier rate</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:32px;align-items:start;" class="r-2col reveal">
      <div>
        <p style="font-size:14px;font-weight:500;color:rgba(34,32,29,0.5);margin-bottom:20px;letter-spacing:0.05em;">POPULATION GROWTH TREND</p>
        <div class="chart-wrap"><canvas id="popChart"></canvas></div>
        <p class="data-note">Source: ABS Regional Population, 2021 Census &amp; projections</p>
      </div>
      <div>
        <p style="font-size:16px;font-weight:300;line-height:1.8;color:rgba(34,32,29,0.7);margin-bottom:18px;">{m['macro_copy']}</p>
        {macro_p2_html}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:24px;">
          <div style="background:#fff;border-radius:12px;border:1px solid rgba(34,32,29,0.07);padding:16px 18px;">
            <p style="font-family:'Fraunces',serif;font-size:22px;font-weight:400;color:#22201d;">{m['employed']}%</p>
            <p style="font-size:12px;font-weight:300;color:rgba(34,32,29,0.5);margin-top:3px;">Employed full-time</p>
          </div>
          <div style="background:#fff;border-radius:12px;border:1px solid rgba(34,32,29,0.07);padding:16px 18px;">
            <p style="font-family:'Fraunces',serif;font-size:22px;font-weight:400;color:#22201d;">{m['unemployment']}%</p>
            <p style="font-size:12px;font-weight:300;color:rgba(34,32,29,0.5);margin-top:3px;">Unemployment rate</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="sec sec-dark">
  <div class="inner">
    <p class="eyebrow reveal">Infrastructure pipeline</p>
    <h2 class="sec-h2 reveal" style="color:#f7f3ed;">Major approved &amp; committed projects</h2>
    <div class="reveal" style="display:inline-flex;align-items:baseline;gap:10px;margin-bottom:44px;padding:20px 28px;background:rgba(189,122,112,0.1);border:1px solid rgba(189,122,112,0.2);border-radius:14px;">
      <span style="font-family:'Fraunces',serif;font-size:42px;font-weight:400;color:#bd7a70;">{m['infra_total']}</span>
      <span style="font-size:15px;font-weight:300;color:rgba(247,243,237,0.5);">total committed &amp; approved infrastructure investment</span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;" class="r-3col">{infra_html}
    </div>
    <p class="data-note-light" style="margin-top:24px;">Sources: Infrastructure Australia, relevant State Government Major Projects Register, local council</p>
  </div>
</section>

<section class="sec sec-warm">
  <div class="inner">
    <p class="eyebrow reveal">Market conditions</p>
    <h2 class="sec-h2 reveal">Supply &amp; demand snapshot</h2>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:52px;align-items:start;" class="r-2col">
      <div class="reveal">
        <p style="font-size:15.5px;font-weight:300;line-height:1.85;color:rgba(34,32,29,0.65);margin-bottom:24px;">The indicators below reflect current conditions across {m['city']}'s rental and sales markets, drawn from publicly available data including SQM Research and CoreLogic. These signals help frame the short-term supply and demand picture — they are context for understanding the market, not a forecast of returns.</p>
        <p style="font-size:15.5px;font-weight:300;line-height:1.85;color:rgba(34,32,29,0.65);">As Fairway gains access to additional data feeds, this section will be expanded with more granular, suburb-level indicators.</p>
      </div>
      <div class="reveal">
        <div style="display:flex;flex-direction:column;gap:20px;">{conds_html}
        </div>
        <p style="font-size:12px;font-weight:300;color:rgba(34,32,29,0.35);margin-top:18px;line-height:1.6;">Source: SQM Research, CoreLogic, ABS. Qualitative assessments based on available market data as at July 2026.</p>
      </div>
    </div>
  </div>
</section>

<section class="sec sec-cream">
  <div class="inner">
    <p class="eyebrow reveal">Prices &amp; rents</p>
    <h2 class="sec-h2 reveal">Median prices, yields &amp; rental trends</h2>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:20px;margin-bottom:52px;" class="r-4col reveal">
      <div style="padding:26px 22px;background:#fff;border-radius:16px;border:1px solid rgba(34,32,29,0.07);box-shadow:0 2px 16px rgba(34,32,29,0.04);">
        <div class="stat-val" data-target="{m['houseMedian']}" data-prefix="$" data-suffix="" data-format="price">0</div>
        <div class="stat-label">Approx. house median</div>
      </div>
      <div style="padding:26px 22px;background:#fff;border-radius:16px;border:1px solid rgba(34,32,29,0.07);box-shadow:0 2px 16px rgba(34,32,29,0.04);">
        <div class="stat-val" data-target="{m['unitMedian']}" data-prefix="$" data-suffix="" data-format="price">0</div>
        <div class="stat-label">Approx. unit median</div>
      </div>
      <div style="padding:26px 22px;background:#fff;border-radius:16px;border:1px solid rgba(34,32,29,0.07);box-shadow:0 2px 16px rgba(34,32,29,0.04);">
        <div style="font-family:'Fraunces',serif;font-size:38px;font-weight:400;line-height:1;letter-spacing:-1px;">{m['houseRentRange']}</div>
        <div class="stat-label">House rent range /wk</div>
      </div>
      <div style="padding:26px 22px;background:#fff;border-radius:16px;border:1px solid rgba(34,32,29,0.07);box-shadow:0 2px 16px rgba(34,32,29,0.04);">
        <div style="font-family:'Fraunces',serif;font-size:38px;font-weight:400;line-height:1;letter-spacing:-1px;">{m['unitRentRange']}</div>
        <div class="stat-label">Unit rent range /wk</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;" class="r-2col">
      <div class="reveal">
        <p style="font-size:13px;font-weight:500;color:rgba(34,32,29,0.45);margin-bottom:18px;letter-spacing:0.05em;text-transform:uppercase;">Median house price — 10 year trend</p>
        <div class="chart-wrap"><canvas id="priceChart"></canvas></div>
        <p class="data-note">Approx. figures. Source: Suburbtrends / CoreLogic</p>
      </div>
      <div class="reveal">
        <p style="font-size:13px;font-weight:500;color:rgba(34,32,29,0.45);margin-bottom:18px;letter-spacing:0.05em;text-transform:uppercase;">Gross yield trend — houses &amp; units</p>
        <div class="chart-wrap"><canvas id="yieldChart"></canvas></div>
        <p class="data-note">Approx. figures. Source: Suburbtrends</p>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:40px;" class="r-2col reveal">
      <div style="background:#fff;border:1px solid rgba(34,32,29,0.07);border-radius:16px;padding:28px;box-shadow:0 2px 16px rgba(34,32,29,0.04);">
        <p style="font-size:12px;font-weight:500;letter-spacing:0.1em;text-transform:uppercase;color:#bd7a70;margin-bottom:10px;">Houses</p>
        <p style="font-family:'Fraunces',serif;font-size:36px;font-weight:400;color:#22201d;line-height:1;">{m['houseYieldRange']}</p>
        <p style="font-size:13px;font-weight:300;color:rgba(34,32,29,0.5);margin-top:6px;">Indicative gross yield range</p>
        <p style="font-size:12px;font-weight:300;color:rgba(34,32,29,0.35);margin-top:8px;line-height:1.6;">Gross yield before ownership expenses (rates, insurance, management, maintenance). Actual returns vary by property.</p>
      </div>
      <div style="background:#fff;border:1px solid rgba(34,32,29,0.07);border-radius:16px;padding:28px;box-shadow:0 2px 16px rgba(34,32,29,0.04);">
        <p style="font-size:12px;font-weight:500;letter-spacing:0.1em;text-transform:uppercase;color:#bd7a70;margin-bottom:10px;">Units</p>
        <p style="font-family:'Fraunces',serif;font-size:36px;font-weight:400;color:#22201d;line-height:1;">{m['unitYieldRange']}</p>
        <p style="font-size:13px;font-weight:300;color:rgba(34,32,29,0.5);margin-top:6px;">Indicative gross yield range</p>
        <p style="font-size:12px;font-weight:300;color:rgba(34,32,29,0.35);margin-top:8px;line-height:1.6;">Gross yield before ownership expenses (rates, insurance, management, maintenance). Actual returns vary by property.</p>
      </div>
    </div>
  </div>
</section>

<section class="sec sec-dark">
  <div class="inner">
    <p class="eyebrow reveal">Supply &amp; demand</p>
    <h2 class="sec-h2 reveal" style="color:#f7f3ed;">Market conditions at a glance</h2>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:52px;" class="r-4col reveal">
      <div style="background:rgba(247,243,237,0.05);border:1px solid rgba(247,243,237,0.09);border-radius:16px;padding:24px 20px;">
        <div class="stat-val" style="font-size:40px;color:#f7f3ed;" data-target="{m['vacancyRate']}" data-prefix="" data-suffix="%" data-decimal="1">0</div>
        <div class="stat-label" style="color:rgba(247,243,237,0.4);">Vacancy rate</div>
      </div>
      <div style="background:rgba(247,243,237,0.05);border:1px solid rgba(247,243,237,0.09);border-radius:16px;padding:24px 20px;">
        <div class="stat-val" style="font-size:40px;color:#f7f3ed;" data-target="{m['daysOnMarket']}" data-prefix="" data-suffix=" days">0</div>
        <div class="stat-label" style="color:rgba(247,243,237,0.4);">Avg. days on market</div>
      </div>
      <div style="background:rgba(247,243,237,0.05);border:1px solid rgba(247,243,237,0.09);border-radius:16px;padding:24px 20px;">
        <div class="stat-val" style="font-size:40px;color:#f7f3ed;" data-target="{m['clearanceRate']}" data-prefix="" data-suffix="%">0</div>
        <div class="stat-label" style="color:rgba(247,243,237,0.4);">Auction clearance rate</div>
      </div>
      <div style="background:rgba(247,243,237,0.05);border:1px solid rgba(247,243,237,0.09);border-radius:16px;padding:24px 20px;">
        <div class="stat-val" style="font-size:40px;color:#f7f3ed;" data-target="{m['propertiesListed']}" data-prefix="" data-suffix="">0</div>
        <div class="stat-label" style="color:rgba(247,243,237,0.4);">Properties listed</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;" class="r-2col">
      <div class="reveal">
        <p style="font-size:13px;font-weight:500;color:rgba(247,243,237,0.35);margin-bottom:18px;letter-spacing:0.05em;text-transform:uppercase;">Vacancy rate trend</p>
        <div class="chart-wrap"><canvas id="vacancyChart"></canvas></div>
        <p class="data-note-light">Source: SQM Research</p>
      </div>
      <div class="reveal">
        <p style="font-size:13px;font-weight:500;color:rgba(247,243,237,0.35);margin-bottom:18px;letter-spacing:0.05em;text-transform:uppercase;">Stock on market (listings count)</p>
        <div class="chart-wrap"><canvas id="stockChart"></canvas></div>
        <p class="data-note-light">Source: SQM Research</p>
      </div>
    </div>
  </div>
</section>

<section class="sec sec-warm">
  <div class="inner">
    <p class="eyebrow reveal">Historical performance</p>
    <h2 class="sec-h2 reveal">How has this market performed?</h2>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:32px;" class="r-2col reveal">
      <div>
        <div style="background:#fff;border-radius:16px;border:1px solid rgba(34,32,29,0.07);overflow:hidden;box-shadow:0 2px 16px rgba(34,32,29,0.04);">
          <div style="padding:18px 22px;border-bottom:1px solid rgba(34,32,29,0.07);background:rgba(189,122,112,0.04);">
            <p style="font-size:12px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#bd7a70;">Houses — annualised growth</p>
          </div>{h_perf}
        </div>
      </div>
      <div>
        <div style="background:#fff;border-radius:16px;border:1px solid rgba(34,32,29,0.07);overflow:hidden;box-shadow:0 2px 16px rgba(34,32,29,0.04);">
          <div style="padding:18px 22px;border-bottom:1px solid rgba(34,32,29,0.07);background:rgba(207,155,146,0.06);">
            <p style="font-size:12px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#cf9b92;">Units — annualised growth</p>
          </div>{u_perf}
        </div>
      </div>
    </div>
    <p class="data-note" style="margin-bottom:40px;">Annualised compound growth rates, {m['lga_name']}. Source: CoreLogic / Suburbtrends. Figures are approximate.</p>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;" class="r-2col reveal">
      <div style="background:#fff;border-radius:16px;border:1px solid rgba(34,32,29,0.07);padding:28px;box-shadow:0 2px 16px rgba(34,32,29,0.04);">
        <p style="font-size:13px;font-weight:500;color:#bd7a70;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:12px;">Comparable market precedent</p>
        <p style="font-size:15.5px;font-weight:300;line-height:1.8;color:rgba(34,32,29,0.7);">{m['comparable_text']}</p>
      </div>
      <div style="background:#fff;border-radius:16px;border:1px solid rgba(34,32,29,0.07);padding:28px;box-shadow:0 2px 16px rgba(34,32,29,0.04);">
        <p style="font-size:13px;font-weight:500;color:#bd7a70;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:12px;">Relative affordability</p>
        <p style="font-size:15.5px;font-weight:300;line-height:1.8;color:rgba(34,32,29,0.7);">{m['affordability_text']}</p>
      </div>
    </div>
  </div>
</section>

<section class="sec sec-cream">
  <div class="inner">
    <p class="eyebrow reveal">Investment case</p>
    <h2 class="sec-h2 reveal">What makes this market compelling?</h2>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:start;" class="r-2col">
      <div class="reveal">
        <p style="font-size:15.5px;font-weight:300;line-height:1.8;color:rgba(34,32,29,0.7);margin-bottom:28px;">{m['investment_intro']}</p>
        <div style="display:flex;flex-wrap:wrap;gap:10px;">
          {tags_html}
        </div>
      </div>
      <div class="reveal">
        <div style="background:#fff;border-radius:16px;border:1px solid rgba(34,32,29,0.07);padding:30px;box-shadow:0 2px 16px rgba(34,32,29,0.04);">
          <p style="font-size:13px;font-weight:500;color:#bd7a70;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:6px;">Indicative price range</p>
          <p style="font-size:13px;font-weight:300;color:rgba(34,32,29,0.4);margin-bottom:18px;line-height:1.5;">Figures are approximate market context only. The right entry point depends on your specific brief — we'll identify that together.</p>
          <div style="display:flex;flex-direction:column;gap:14px;">
            <div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:14px;border-bottom:1px solid rgba(34,32,29,0.07);">
              <span style="font-size:14.5px;font-weight:300;color:rgba(34,32,29,0.7);">Houses</span>
              <span style="font-size:15px;font-weight:600;color:#22201d;">{m['entry_house']}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span style="font-size:14.5px;font-weight:300;color:rgba(34,32,29,0.7);">Units</span>
              <span style="font-size:15px;font-weight:600;color:#22201d;">{m['entry_unit']}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="sec sec-dark">
  <div class="inner" style="max-width:760px;">
    <p class="eyebrow reveal">What to watch</p>
    <h2 class="sec-h2 reveal" style="color:#f7f3ed;">Risks &amp; conditions to monitor</h2>
    <div class="reveal">{risks_html}
    </div>
  </div>
</section>

<section class="sec sec-deeper">
  <div class="inner" style="max-width:860px;">
    <p class="eyebrow reveal">Fairway's view</p>
    <h2 class="sec-h2 reveal" style="color:#f7f3ed;">Luke's take</h2>
    <div class="lukes-take-card reveal">
      <div style="display:flex;align-items:flex-start;gap:24px;margin-bottom:28px;">
        <div style="width:64px;height:64px;border-radius:50%;overflow:hidden;border:2px solid #bd7a70;flex-shrink:0;">
          <img src="/assets/luke.jpg" alt="Luke Clifford" style="width:100%;height:100%;object-fit:cover;object-position:center 12%;display:block;">
        </div>
        <div>
          <p style="font-size:15px;font-weight:500;color:#f7f3ed;">Luke Clifford</p>
          <p style="font-size:13px;font-weight:300;color:rgba(247,243,237,0.4);margin-top:2px;">Founder, Fairway Investing</p>
        </div>
      </div>
      <p style="font-size:17px;font-weight:300;line-height:1.85;color:rgba(247,243,237,0.75);margin-bottom:20px;">{m['lukes_p1']}</p>
      <p style="font-size:17px;font-weight:300;line-height:1.85;color:rgba(247,243,237,0.75);">{m['lukes_p2']}</p>
    </div>
  </div>
</section>

<section style="background:#1a1916;padding:32px 44px;border-top:1px solid rgba(247,243,237,0.06);">
  <div class="inner">
    <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:20px;">
      <div>
        <p style="font-size:12px;font-weight:500;letter-spacing:0.1em;text-transform:uppercase;color:rgba(247,243,237,0.25);margin-bottom:8px;">Data sources</p>
        <p style="font-size:13px;font-weight:300;color:rgba(247,243,237,0.35);line-height:1.6;">{m['data_sources']}</p>
      </div>
      <div style="text-align:right;flex-shrink:0;">
        <p style="font-size:12px;font-weight:500;letter-spacing:0.1em;text-transform:uppercase;color:rgba(247,243,237,0.25);margin-bottom:6px;">Report currency</p>
        <p style="font-size:13px;font-weight:400;color:#bd7a70;">July 2026</p>
        <p style="font-size:12px;font-weight:300;color:rgba(247,243,237,0.3);margin-top:4px;">Next update: August 2026</p>
      </div>
    </div>
  </div>
</section>

<footer style="background:#1a1916;border-top:1px solid rgba(247,243,237,0.07);padding:24px 44px;text-align:center;">
  <p style="font-size:12px;font-weight:300;color:rgba(247,243,237,0.2);line-height:1.7;">This report is prepared by Fairway Investing for client use only. Data is sourced from third parties and is believed to be reliable but is not guaranteed. Figures are approximate and should be independently verified. This report does not constitute financial advice. &copy; 2026 Fairway Investing Pty Ltd &nbsp;&middot;&nbsp; ABN 68 699 032 598</p>
</footer>

<script>
{js}
</script>
</body>
</html>"""
    return page


# ─── MAIN ────────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    os.makedirs(OUT_DIR, exist_ok=True)
    for m in MARKETS:
        html = generate_html(m)
        path = os.path.join(OUT_DIR, m['filename'])
        with open(path, 'w', encoding='utf-8') as f:
            f.write(html)
        print(f'  Generated: reports/{m["filename"]}')
    print(f'\nDone. {len(MARKETS)} files written.')
