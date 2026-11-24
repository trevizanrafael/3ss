import { ClubData } from './types';

export const SPAIN_AND_PORTUGAL_CLUBS: ClubData[] = [
  // LA LIGA
  {
    id: 'real_madrid', name: 'Real Madrid', shortName: 'RMA', wikiTitle: 'Real_Madrid_CF',
    country: 'ESP', leagueId: 'ESP_1', reputationStars: 3, squadAvgOvr: 87,
    youthAcademyName: 'La Fábrica (Castilla / Juvenil A)', youthQuality: 92,
    primaryColor: '#FFFFFF', secondaryColor: '#FEBE10', pattern: 'solid',
    keyPlayers: [
      { name: 'Kylian Mbappé', pos: 'ATA', ovr: 91 },
      { name: 'Vinícius Júnior', pos: 'PE', ovr: 90 },
      { name: 'Jude Bellingham', pos: 'MEI', ovr: 90 },
      { name: 'Federico Valverde', pos: 'MC', ovr: 88 },
    ],
  },
  {
    id: 'barcelona', name: 'FC Barcelona', shortName: 'BAR', wikiTitle: 'FC_Barcelona',
    country: 'ESP', leagueId: 'ESP_1', reputationStars: 3, squadAvgOvr: 85,
    youthAcademyName: 'La Masia (Juvenil A)', youthQuality: 95,
    primaryColor: '#A50044', secondaryColor: '#004D98', pattern: 'stripes',
    keyPlayers: [
      { name: 'Lamine Yamal', pos: 'PD', ovr: 86 },
      { name: 'Pedri', pos: 'MC', ovr: 87 },
      { name: 'Raphinha', pos: 'PE', ovr: 86 },
      { name: 'Robert Lewandowski', pos: 'ATA', ovr: 88 },
    ],
  },
  {
    id: 'atletico_madrid', name: 'Atlético de Madrid', shortName: 'ATM', wikiTitle: 'Atlético_Madrid',
    country: 'ESP', leagueId: 'ESP_1', reputationStars: 3, squadAvgOvr: 84,
    youthAcademyName: 'Academia Atlético Juvenil', youthQuality: 86,
    primaryColor: '#CB3524', secondaryColor: '#FFFFFF', pattern: 'stripes',
    keyPlayers: [{ name: 'Antoine Griezmann', pos: 'SA', ovr: 88 }, { name: 'Julián Álvarez', pos: 'ATA', ovr: 85 }],
  },
  {
    id: 'athletic_bilbao', name: 'Athletic Club', shortName: 'ATH', wikiTitle: 'Athletic_Bilbao',
    country: 'ESP', leagueId: 'ESP_1', reputationStars: 2, squadAvgOvr: 81,
    youthAcademyName: 'Lezama Juvenil', youthQuality: 89,
    primaryColor: '#EE2523', secondaryColor: '#FFFFFF', pattern: 'stripes',
    keyPlayers: [{ name: 'Nico Williams', pos: 'PE', ovr: 85 }, { name: 'Oihan Sancet', pos: 'MEI', ovr: 82 }],
  },
  {
    id: 'real_betis', name: 'Real Betis', shortName: 'BET', wikiTitle: 'Real_Betis',
    country: 'ESP', leagueId: 'ESP_1', reputationStars: 2, squadAvgOvr: 79,
    youthAcademyName: 'Betis Deportivo Juvenil', youthQuality: 80,
    primaryColor: '#0BB363', secondaryColor: '#FFFFFF', pattern: 'stripes',
    keyPlayers: [{ name: 'Isco', pos: 'MEI', ovr: 83 }, { name: 'Giovani Lo Celso', pos: 'MC', ovr: 82 }],
  },
  // LA LIGA 2
  {
    id: 'deportivo', name: 'Deportivo La Coruña', shortName: 'DEP', wikiTitle: 'Deportivo_de_La_Coruña',
    country: 'ESP', leagueId: 'ESP_2', reputationStars: 2, squadAvgOvr: 72,
    youthAcademyName: 'Abegondo Juvenil', youthQuality: 79,
    primaryColor: '#0033A0', secondaryColor: '#FFFFFF', pattern: 'stripes',
    keyPlayers: [{ name: 'Yeremay Hernández', pos: 'PE', ovr: 75 }, { name: 'Lucas Pérez', pos: 'ATA', ovr: 74 }],
  },
  {
    id: 'zaragoza', name: 'Real Zaragoza', shortName: 'ZAR', wikiTitle: 'Real_Zaragoza',
    country: 'ESP', leagueId: 'ESP_2', reputationStars: 1, squadAvgOvr: 71,
    youthAcademyName: 'Ciudad Deportiva Zaragoza', youthQuality: 76,
    primaryColor: '#FFFFFF', secondaryColor: '#004B9B', pattern: 'solid',
    keyPlayers: [{ name: 'Mario Soberón', pos: 'ATA', ovr: 72 }],
  },
  {
    id: 'racing_santander', name: 'Racing Santander', shortName: 'RSA', wikiTitle: 'Racing_de_Santander',
    country: 'ESP', leagueId: 'ESP_2', reputationStars: 1, squadAvgOvr: 72,
    youthAcademyName: 'Instalaciones Nando Yosu', youthQuality: 75,
    primaryColor: '#00843D', secondaryColor: '#FFFFFF', pattern: 'halves',
    keyPlayers: [{ name: 'Íñigo Vicente', pos: 'PE', ovr: 74 }],
  },
  // LIGA PORTUGAL (LIGA NOS)
  {
    id: 'sporting', name: 'Sporting CP', shortName: 'SCP', wikiTitle: 'Sporting_CP',
    country: 'POR', leagueId: 'POR_1', reputationStars: 3, squadAvgOvr: 81,
    youthAcademyName: 'Academia Cristiano Ronaldo (Alcochete)', youthQuality: 93,
    primaryColor: '#008057', secondaryColor: '#FFFFFF', pattern: 'hoops',
    keyPlayers: [
      { name: 'Viktor Gyökeres', pos: 'ATA', ovr: 86 },
      { name: 'Pedro Gonçalves', pos: 'MEI', ovr: 82 },
      { name: 'Morten Hjulmand', pos: 'VOL', ovr: 81 },
    ],
  },
  {
    id: 'benfica', name: 'SL Benfica', shortName: 'SLB', wikiTitle: 'S.L._Benfica',
    country: 'POR', leagueId: 'POR_1', reputationStars: 3, squadAvgOvr: 81,
    youthAcademyName: 'Benfica Campus (Seixal)', youthQuality: 93,
    primaryColor: '#E83030', secondaryColor: '#FFFFFF', pattern: 'solid',
    keyPlayers: [
      { name: 'Ángel Di María', pos: 'PD', ovr: 83 },
      { name: 'Orkun Kökçü', pos: 'MC', ovr: 81 },
      { name: 'Nicolás Otamendi', pos: 'ZAG', ovr: 80 },
    ],
  },
  {
    id: 'porto', name: 'FC Porto', shortName: 'FCP', wikiTitle: 'FC_Porto',
    country: 'POR', leagueId: 'POR_1', reputationStars: 3, squadAvgOvr: 80,
    youthAcademyName: 'Olival Sub-19', youthQuality: 89,
    primaryColor: '#00428C', secondaryColor: '#FFFFFF', pattern: 'stripes',
    keyPlayers: [{ name: 'Samu Aghehowa', pos: 'ATA', ovr: 80 }, { name: 'Alan Varela', pos: 'VOL', ovr: 80 }],
  },
  {
    id: 'braga', name: 'SC Braga', shortName: 'SCB', wikiTitle: 'S.C._Braga',
    country: 'POR', leagueId: 'POR_1', reputationStars: 2, squadAvgOvr: 77,
    youthAcademyName: 'Cidade Desportiva Braga', youthQuality: 82,
    primaryColor: '#D6001C', secondaryColor: '#FFFFFF', pattern: 'solid',
    keyPlayers: [{ name: 'Ricardo Horta', pos: 'PE', ovr: 80 }, { name: 'Rodrigo Zalazar', pos: 'MC', ovr: 78 }],
  },
  // LIGA PORTUGAL 2
  {
    id: 'maritimo', name: 'CS Marítimo', shortName: 'MAR', wikiTitle: 'C.S._Marítimo',
    country: 'POR', leagueId: 'POR_2', reputationStars: 1, squadAvgOvr: 69,
    youthAcademyName: 'Formação Marítimo Sub-23', youthQuality: 72,
    primaryColor: '#006837', secondaryColor: '#E30613', pattern: 'stripes',
    keyPlayers: [{ name: 'Euller', pos: 'PD', ovr: 70 }],
  },
  {
    id: 'chaves', name: 'GD Chaves', shortName: 'CHA', wikiTitle: 'G.D._Chaves',
    country: 'POR', leagueId: 'POR_2', reputationStars: 1, squadAvgOvr: 69,
    youthAcademyName: 'Formação Valentes Transmontanos', youthQuality: 70,
    primaryColor: '#8B0029', secondaryColor: '#003366', pattern: 'stripes',
    keyPlayers: [{ name: 'Pedro Pinho', pos: 'MC', ovr: 69 }],
  },
  {
    id: 'pacos_ferreira', name: 'Paços de Ferreira', shortName: 'PAC', wikiTitle: 'F.C._Paços_de_Ferreira',
    country: 'POR', leagueId: 'POR_2', reputationStars: 1, squadAvgOvr: 68,
    youthAcademyName: 'Mata Real Formação', youthQuality: 71,
    primaryColor: '#FEDD00', secondaryColor: '#006837', pattern: 'solid',
    keyPlayers: [{ name: 'Vitorino Antunes', pos: 'LE', ovr: 70 }],
  },
];
