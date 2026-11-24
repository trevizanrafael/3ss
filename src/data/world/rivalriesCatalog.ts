export type RivalryTier = 'FEROZ' | 'HISTORICO' | 'LOCAL';

export interface NamedRivalrySpec {
  clubA: string;
  clubB: string;
  name: string;
  tier: RivalryTier;
}

/**
 * Catálogo Mundial Oficial de Clássicos e Rivalidades Históricas
 * Todos os IDs verificados nos elencos das 19 ligas/pools + 64 Seleções FIFA.
 */
export const GLOBAL_RIVALRIES_CATALOG: NamedRivalrySpec[] = [
  // ==================== BRASIL (SÉRIE A & SÉRIE B) ====================
  { clubA: 'corinthians_874', clubB: 'palmeiras_2029', name: 'DERBY PAULISTA', tier: 'FEROZ' },
  { clubA: 'corinthians_874', clubB: 'sao_paulo_2026', name: 'CLÁSSICO MAJESTOSO', tier: 'HISTORICO' },
  { clubA: 'corinthians_874', clubB: 'santos_2674', name: 'CLÁSSICO ALVINEGRO', tier: 'HISTORICO' },
  { clubA: 'palmeiras_2029', clubB: 'sao_paulo_2026', name: 'CHOQUE-REI', tier: 'FEROZ' },
  { clubA: 'palmeiras_2029', clubB: 'santos_2674', name: 'CLÁSSICO DA SAUDADE', tier: 'HISTORICO' },
  { clubA: 'santos_2674', clubB: 'sao_paulo_2026', name: 'SAN-SÃO', tier: 'HISTORICO' },

  { clubA: 'flamengo_819', clubB: 'fluminense_3445', name: 'FLA-FLU', tier: 'FEROZ' },
  { clubA: 'flamengo_819', clubB: 'vasco_da_gama_3454', name: 'CLÁSSICO DOS MILHÕES', tier: 'FEROZ' },
  { clubA: 'flamengo_819', clubB: 'botafogo_6086', name: 'CLÁSSICO DA RIVALIDADE', tier: 'HISTORICO' },
  { clubA: 'fluminense_3445', clubB: 'vasco_da_gama_3454', name: 'CLÁSSICO DOS GIGANTES', tier: 'HISTORICO' },
  { clubA: 'fluminense_3445', clubB: 'botafogo_6086', name: 'CLÁSSICO VOVÔ', tier: 'HISTORICO' },
  { clubA: 'botafogo_6086', clubB: 'vasco_da_gama_3454', name: 'CLÁSSICO DA AMIZADE', tier: 'LOCAL' },

  { clubA: 'gremio_6273', clubB: 'internacional_1936', name: 'GRENAL', tier: 'FEROZ' },
  { clubA: 'atletico_mg_7632', clubB: 'cruzeiro_2022', name: 'SUPERCLÁSSICO MINEIRO', tier: 'FEROZ' },
  { clubA: 'atletico_mg_7632', clubB: 'america_mineiro_6154', name: 'CLÁSSICO DAS MULTIDÕES', tier: 'LOCAL' },
  { clubA: 'cruzeiro_2022', clubB: 'america_mineiro_6154', name: 'COELHO × RAPOSA', tier: 'LOCAL' },

  { clubA: 'bahia_9967', clubB: 'vitoria_3457', name: 'CLÁSSICO BA-VI', tier: 'FEROZ' },
  { clubA: 'athletico_pr_3458', clubB: 'coritiba_3456', name: 'ATHLETIBA', tier: 'FEROZ' },
  { clubA: 'ceara_9969', clubB: 'fortaleza_6272', name: 'CLÁSSICO-REI', tier: 'FEROZ' },
  { clubA: 'sport_7635', clubB: 'nautico_7633', name: 'CLÁSSICO DOS CLÁSSICOS', tier: 'FEROZ' },
  { clubA: 'goias_3395', clubB: 'vila_nova_9973', name: 'DERBY DO CERRADO', tier: 'FEROZ' },
  { clubA: 'goias_3395', clubB: 'atletico_goianiense_10357', name: 'CLÁSSICO GOIANO', tier: 'HISTORICO' },
  { clubA: 'vila_nova_9973', clubB: 'atletico_goianiense_10357', name: 'CLÁSSICO DE GOIÂNIA', tier: 'HISTORICO' },
  { clubA: 'avai_9966', clubB: 'criciuma_9971', name: 'CLÁSSICO CATARINENSE', tier: 'HISTORICO' },
  { clubA: 'chapecoense_9318', clubB: 'avai_9966', name: 'DUELO DE SANTA CATARINA', tier: 'LOCAL' },
  { clubA: 'londrina_17333', clubB: 'operario_pr_18187', name: 'CLÁSSICO DO INTERIOR-PR', tier: 'LOCAL' },

  // Grandes rivalidades interestaduais modernas do Brasil
  { clubA: 'flamengo_819', clubB: 'palmeiras_2029', name: 'CLÁSSICO NACIONAL MODERNO', tier: 'HISTORICO' },
  { clubA: 'flamengo_819', clubB: 'atletico_mg_7632', name: 'RIVALIDADE INTERESTADUAL', tier: 'HISTORICO' },
  { clubA: 'flamengo_819', clubB: 'corinthians_874', name: 'ENCONTRO DAS NAÇÕES', tier: 'HISTORICO' },

  // ==================== ARGENTINA & CONMEBOL ====================
  { clubA: 'boca_juniors_5', clubB: 'river_plate_16', name: 'SUPERCLÁSICO ARGENTINO', tier: 'FEROZ' },
  { clubA: 'racing_club_15', clubB: 'independiente_11', name: 'CLÁSICO DE AVELLANEDA', tier: 'FEROZ' },
  { clubA: 'san_lorenzo_18', clubB: 'huracan_10', name: 'CLÁSICO PORTEÑO', tier: 'FEROZ' },
  { clubA: 'rosario_central_17', clubB: 'newell_s_old_boys_14', name: 'CLÁSICO ROSARINO', tier: 'FEROZ' },
  { clubA: 'estudiantes_de_la_plata_8', clubB: 'gimnasia_la_plata_9', name: 'CLÁSICO PLATENSE', tier: 'FEROZ' },
  { clubA: 'talleres_cordoba_19', clubB: 'belgrano_cordoba_4', name: 'CLÁSICO CORDOBÉS', tier: 'FEROZ' },
  { clubA: 'talleres_cordoba_19', clubB: 'instituto_cordoba_2975', name: 'DUELO DE CÓRDOBA', tier: 'LOCAL' },
  { clubA: 'lanus_12', clubB: 'banfield_235', name: 'CLÁSICO DEL SUR', tier: 'HISTORICO' },
  { clubA: 'union_santa_fe_20', clubB: 'colon_santa_fe_7', name: 'CLÁSICO SANTAFESINO', tier: 'FEROZ' },
  { clubA: 'argentinos_juniors_3', clubB: 'platense_7764', name: 'CLÁSICO SAAVEDRA-PATERNAL', tier: 'LOCAL' },
  { clubA: 'velez_sarsfield_21', clubB: 'ferro_carril_oeste_9743', name: 'CLÁSICO DEL OESTE', tier: 'HISTORICO' },
  { clubA: 'chacarita_juniors_6', clubB: 'atlanta_10146', name: 'CLÁSICO DE VILLA CRESPO', tier: 'HISTORICO' },
  { clubA: 'boca_juniors_5', clubB: 'independiente_11', name: 'CLÁSICO GRANDE', tier: 'HISTORICO' },
  { clubA: 'river_plate_16', clubB: 'racing_club_15', name: 'CLÁSICO MAIS ANTIGO', tier: 'HISTORICO' },

  { clubA: 'nacional_2684', clubB: 'penarol_2683', name: 'SUPERCLÁSICO URUGUAYO', tier: 'FEROZ' },
  { clubA: 'cerro_porteno_2671', clubB: 'libertad_2670', name: 'CLÁSICO PARAGUAYO', tier: 'HISTORICO' },
  { clubA: 'liga_de_quito_4816', clubB: 'barcelona_sc_2686', name: 'CLÁSICO EQUATORIANO', tier: 'HISTORICO' },

  // ==================== INGLATERRA (PREMIER LEAGUE & CHAMPIONSHIP) ====================
  { clubA: 'liverpool_364', clubB: 'manchester_united_360', name: 'NORTH WEST DERBY', tier: 'FEROZ' },
  { clubA: 'manchester_city_382', clubB: 'manchester_united_360', name: 'MANCHESTER DERBY', tier: 'FEROZ' },
  { clubA: 'liverpool_364', clubB: 'everton_368', name: 'MERSEYSIDE DERBY', tier: 'FEROZ' },
  { clubA: 'arsenal_359', clubB: 'tottenham_hotspur_367', name: 'NORTH LONDON DERBY', tier: 'FEROZ' },
  { clubA: 'arsenal_359', clubB: 'chelsea_363', name: 'LONDON DERBY', tier: 'HISTORICO' },
  { clubA: 'chelsea_363', clubB: 'tottenham_hotspur_367', name: 'LONDON RIVALRY', tier: 'HISTORICO' },
  { clubA: 'chelsea_363', clubB: 'fulham_370', name: 'WEST LONDON DERBY', tier: 'LOCAL' },
  { clubA: 'fulham_370', clubB: 'brentford_337', name: 'WEST LONDON DERBY', tier: 'LOCAL' },
  { clubA: 'liverpool_364', clubB: 'manchester_city_382', name: 'MODERN TITLE CLASH', tier: 'HISTORICO' },
  { clubA: 'newcastle_united_361', clubB: 'sunderland_366', name: 'TYNE-WEAR DERBY', tier: 'FEROZ' },
  { clubA: 'aston_villa_362', clubB: 'birmingham_city_392', name: 'SECOND CITY DERBY', tier: 'FEROZ' },
  { clubA: 'wolverhampton_wanderers_380', clubB: 'west_bromwich_albion_383', name: 'BLACK COUNTRY DERBY', tier: 'FEROZ' },
  { clubA: 'west_ham_united_371', clubB: 'millwall_391', name: 'DOCKERS DERBY', tier: 'FEROZ' },
  { clubA: 'southampton_376', clubB: 'portsmouth_385', name: 'SOUTH COAST DERBY', tier: 'FEROZ' },
  { clubA: 'crystal_palace_384', clubB: 'brighton_hove_albion_331', name: 'M23 DERBY', tier: 'HISTORICO' },
  { clubA: 'nottingham_forest_393', clubB: 'derby_county_374', name: 'EAST MIDLANDS DERBY', tier: 'FEROZ' },
  { clubA: 'leeds_united_357', clubB: 'manchester_united_360', name: 'ROSES RIVALRY', tier: 'FEROZ' },
  { clubA: 'swansea_city_318', clubB: 'cardiff_city_347', name: 'SOUTH WALES DERBY', tier: 'FEROZ' },
  { clubA: 'burnley_379', clubB: 'blackburn_rovers_365', name: 'EAST LANCASHIRE DERBY', tier: 'FEROZ' },
  { clubA: 'ipswich_town_373', clubB: 'norwich_city_381', name: 'EAST ANGLIAN DERBY', tier: 'FEROZ' },

  // ==================== ESPANHA (LALIGA 1 & 2) ====================
  { clubA: 'real_madrid_86', clubB: 'barcelona_83', name: 'EL CLÁSICO', tier: 'FEROZ' },
  { clubA: 'real_madrid_86', clubB: 'atletico_madrid_1068', name: 'EL DERBI MADRILEÑO', tier: 'FEROZ' },
  { clubA: 'barcelona_83', clubB: 'espanyol_88', name: 'DERBI BARCELONÍ', tier: 'HISTORICO' },
  { clubA: 'sevilla_243', clubB: 'real_betis_244', name: 'EL GRAN DERBI', tier: 'FEROZ' },
  { clubA: 'athletic_club_93', clubB: 'real_sociedad_89', name: 'EUSKAL DERBIA', tier: 'FEROZ' },
  { clubA: 'valencia_94', clubB: 'villarreal_102', name: 'DERBI DE LA COMUNITAT', tier: 'HISTORICO' },
  { clubA: 'valencia_94', clubB: 'levante_1538', name: 'DERBI VALENCIANO', tier: 'LOCAL' },
  { clubA: 'celta_vigo_85', clubB: 'deportivo_90', name: 'O NOSO DERBI (GALEGO)', tier: 'FEROZ' },
  { clubA: 'sporting_gijon_3788', clubB: 'real_oviedo_92', name: 'DERBI ASTURIANO', tier: 'FEROZ' },
  { clubA: 'las_palmas_98', clubB: 'tenerife_245', name: 'DERBI CANARIO', tier: 'FEROZ' },
  { clubA: 'getafe_2922', clubB: 'leganes_17534', name: 'DERBI DEL SUR DE MADRID', tier: 'LOCAL' },

  // ==================== ITÁLIA (SERIE A & B) ====================
  { clubA: 'internazionale_110', clubB: 'ac_milan_103', name: 'DERBY DELLA MADONNINA', tier: 'FEROZ' },
  { clubA: 'internazionale_110', clubB: 'juventus_111', name: "DERBY D'ITALIA", tier: 'FEROZ' },
  { clubA: 'ac_milan_103', clubB: 'juventus_111', name: 'CLÁSSICO MILAN × JUVE', tier: 'HISTORICO' },
  { clubA: 'as_roma_104', clubB: 'lazio_112', name: 'DERBY DELLA CAPITALE', tier: 'FEROZ' },
  { clubA: 'juventus_111', clubB: 'torino_239', name: 'DERBY DELLA MOLE', tier: 'FEROZ' },
  { clubA: 'napoli_114', clubB: 'as_roma_104', name: 'DERBY DEL SOLE', tier: 'HISTORICO' },
  { clubA: 'napoli_114', clubB: 'juventus_111', name: 'RIVALIDADE NORTE-SUL', tier: 'FEROZ' },
  { clubA: 'genoa_3263', clubB: 'sampdoria_2734', name: 'DERBY DELLA LANTERNA', tier: 'FEROZ' },
  { clubA: 'fiorentina_109', clubB: 'juventus_111', name: 'RIVALIDADE FIORENTINA × JUVE', tier: 'HISTORICO' },
  { clubA: 'fiorentina_109', clubB: 'bologna_107', name: "DERBY DELL'APPENNINO", tier: 'HISTORICO' },
  { clubA: 'hellas_verona_119', clubB: 'vicenza_120', name: 'DERBY DEL VENETO', tier: 'HISTORICO' },

  // ==================== ALEMANHA (BUNDESLIGA 1 & 2) ====================
  { clubA: 'bayern_munich_132', clubB: 'borussia_dortmund_124', name: 'DER KLASSIKER', tier: 'FEROZ' },
  { clubA: 'borussia_dortmund_124', clubB: 'schalke_04_133', name: 'REVIERDERBY', tier: 'FEROZ' },
  { clubA: 'schalke_04_133', clubB: 'vfl_bochum_121', name: 'KLEINES REVIERDERBY', tier: 'LOCAL' },
  { clubA: 'fc_cologne_122', clubB: 'borussia_monchengladbach_268', name: 'RHEINISCHES DERBY', tier: 'FEROZ' },
  { clubA: 'fc_cologne_122', clubB: 'bayer_leverkusen_131', name: 'RHEINDERBY', tier: 'HISTORICO' },
  { clubA: 'hamburg_sv_127', clubB: 'st_pauli_270', name: 'HAMBURGER STADTDERBY', tier: 'FEROZ' },
  { clubA: 'hamburg_sv_127', clubB: 'werder_bremen_137', name: 'NORDDERBY', tier: 'FEROZ' },
  { clubA: '1_fc_union_berlin_598', clubB: 'hertha_berlin_129', name: 'BERLINER STADTDERBY', tier: 'FEROZ' },
  { clubA: '1_fc_nurnberg_269', clubB: 'spvgg_greuther_furth_3070', name: 'FRANKENDERBY', tier: 'HISTORICO' },
  { clubA: 'hannover_96_2428', clubB: 'tsv_eintracht_braunschweig_3067', name: 'NIEDERSACHSENDERBY', tier: 'FEROZ' },
  { clubA: 'vfb_stuttgart_134', clubB: 'karlsruher_sc_4471', name: 'BADEN-WÜRTTEMBERG-DERBY', tier: 'FEROZ' },
  { clubA: 'eintracht_frankfurt_125', clubB: 'mainz_2950', name: 'RHEIN-MAIN-DERBY', tier: 'LOCAL' },

  // ==================== FRANÇA (LIGUE 1 & 2) ====================
  { clubA: 'paris_saint_germain_160', clubB: 'marseille_176', name: 'LE CLASSIQUE', tier: 'FEROZ' },
  { clubA: 'lyon_167', clubB: 'saint_etienne_178', name: 'DERBY RHÔNE-ALPES', tier: 'FEROZ' },
  { clubA: 'lyon_167', clubB: 'marseille_176', name: 'CHOC DES OLYMPIQUES', tier: 'HISTORICO' },
  { clubA: 'lille_166', clubB: 'lens_175', name: 'DERBY DU NORD', tier: 'FEROZ' },
  { clubA: 'nice_2502', clubB: 'as_monaco_174', name: "DERBY DE LA CÔTE D'AZUR", tier: 'HISTORICO' },
  { clubA: 'stade_rennais_169', clubB: 'nantes_165', name: 'DERBY BRETON', tier: 'HISTORICO' },
  { clubA: 'paris_saint_germain_160', clubB: 'paris_fc_6851', name: 'DERBY PARISIEN', tier: 'LOCAL' },
  { clubA: 'metz_177', clubB: 'as_nancy_lorraine_3267', name: 'DERBY LORRAIN', tier: 'FEROZ' },

  // ==================== PORTUGAL (LIGA PORTUGAL 1 & 2) ====================
  { clubA: 'benfica_1929', clubB: 'fc_porto_437', name: 'O CLÁSSICO', tier: 'FEROZ' },
  { clubA: 'benfica_1929', clubB: 'sporting_cp_2250', name: 'DÉRBI DE LISBOA', tier: 'FEROZ' },
  { clubA: 'fc_porto_437', clubB: 'sporting_cp_2250', name: 'CLÁSSICO DRAGÕES × LEÕES', tier: 'HISTORICO' },
  { clubA: 'braga_2994', clubB: 'vitoria_de_guimaraes_5309', name: 'DÉRBI DO MINHO', tier: 'FEROZ' },
  { clubA: 'maritimo_552', clubB: 'c_d_nacional_3472', name: 'DÉRBI DA MADEIRA', tier: 'HISTORICO' },

  // ==================== MLS (ESTADOS UNIDOS & CANADÁ) ====================
  { clubA: 'la_galaxy_187', clubB: 'lafc_18966', name: 'EL TRÁFICO', tier: 'FEROZ' },
  { clubA: 'red_bull_new_york_190', clubB: 'new_york_city_fc_17606', name: 'HUDSON RIVER DERBY', tier: 'FEROZ' },
  { clubA: 'seattle_sounders_fc_9726', clubB: 'portland_timbers_9723', name: 'CASCADIA DERBY', tier: 'FEROZ' },
  { clubA: 'seattle_sounders_fc_9726', clubB: 'vancouver_whitecaps_9727', name: 'CASCADIA CUP', tier: 'LOCAL' },
  { clubA: 'columbus_crew_183', clubB: 'fc_cincinnati_18267', name: 'HELL IS REAL DERBY', tier: 'FEROZ' },
  { clubA: 'inter_miami_cf_20232', clubB: 'orlando_city_sc_12011', name: 'FLORIDA DERBY', tier: 'HISTORICO' },
  { clubA: 'fc_dallas_185', clubB: 'houston_dynamo_fc_6077', name: 'TEXAS DERBY', tier: 'HISTORICO' },
  { clubA: 'toronto_fc_7318', clubB: 'cf_montreal_9720', name: 'CANADIAN CLASSIQUE', tier: 'HISTORICO' },

  // ==================== EUROPA CONTINENTAL (UEFA POOL) ====================
  { clubA: 'galatasaray_432', clubB: 'fenerbahce_436', name: 'DERBY INTERCONTINENTAL DE ISTAMBUL', tier: 'FEROZ' },
  { clubA: 'galatasaray_432', clubB: 'besiktas_1895', name: 'CLÁSSICO DE ISTAMBUL', tier: 'FEROZ' },
  { clubA: 'fenerbahce_436', clubB: 'besiktas_1895', name: 'CLÁSSICO DE ISTAMBUL', tier: 'FEROZ' },
  { clubA: 'psv_eindhoven_148', clubB: 'feyenoord_rotterdam_142', name: 'DE KRAKER (HOLANDA)', tier: 'HISTORICO' },
  { clubA: 'club_brugge_570', clubB: 'anderlecht_441', name: 'DE TOPPER BELGA', tier: 'FEROZ' },

  // ==================== CLÁSSICOS DE SELEÇÕES FIFA ====================
  { clubA: 'nt_bra', clubB: 'nt_arg', name: 'SUPERCLÁSSICO DAS AMÉRICAS', tier: 'FEROZ' },
  { clubA: 'nt_bra', clubB: 'nt_uru', name: 'CLÁSSICO DO RIO DA PRATA / MARACANAZO', tier: 'HISTORICO' },
  { clubA: 'nt_arg', clubB: 'nt_uru', name: 'CLÁSICO DEL RÍO DE LA PLATA', tier: 'FEROZ' },
  { clubA: 'nt_eng', clubB: 'nt_ger', name: 'CLÁSSICO EUROPEU HISTÓRICO', tier: 'HISTORICO' },
  { clubA: 'nt_ger', clubB: 'nt_ned', name: 'RIVALIDADE ALEMANHA × HOLANDA', tier: 'FEROZ' },
  { clubA: 'nt_esp', clubB: 'nt_por', name: 'DÉRBI IBÉRICO', tier: 'HISTORICO' },
  { clubA: 'nt_fra', clubB: 'nt_ita', name: 'CLÁSSICO TRANSALPINO', tier: 'HISTORICO' },
  { clubA: 'nt_usa', clubB: 'nt_mex', name: 'CLÁSICO DA CONCACAF', tier: 'FEROZ' },
  { clubA: 'nt_jpn', clubB: 'nt_kor', name: 'SUPERCLÁSSICO ASIÁTICO', tier: 'FEROZ' },
  { clubA: 'nt_arg', clubB: 'nt_eng', name: 'RIVALIDADE INTERCONTINENTAL', tier: 'HISTORICO' },
];
