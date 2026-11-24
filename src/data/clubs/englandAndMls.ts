import { ClubData } from './types';

export const ENGLAND_AND_MLS_CLUBS: ClubData[] = [
  // PREMIER LEAGUE
  {
    id: 'man_city', name: 'Manchester City', shortName: 'MCI', wikiTitle: 'Manchester_City_F.C.',
    country: 'ENG', leagueId: 'ENG_1', reputationStars: 3, squadAvgOvr: 86,
    youthAcademyName: 'City Football Academy U21', youthQuality: 92,
    primaryColor: '#6CABDD', secondaryColor: '#FFFFFF', pattern: 'solid',
    keyPlayers: [
      { name: 'Erling Haaland', pos: 'ATA', ovr: 91 },
      { name: 'Rodri', pos: 'VOL', ovr: 91 },
      { name: 'Phil Foden', pos: 'PD', ovr: 88 },
    ],
  },
  {
    id: 'liverpool', name: 'Liverpool', shortName: 'LIV', wikiTitle: 'Liverpool_F.C.',
    country: 'ENG', leagueId: 'ENG_1', reputationStars: 3, squadAvgOvr: 85,
    youthAcademyName: 'Kirkby Academy U21', youthQuality: 88,
    primaryColor: '#C8102E', secondaryColor: '#FFFFFF', pattern: 'solid',
    keyPlayers: [
      { name: 'Mohamed Salah', pos: 'PD', ovr: 89 },
      { name: 'Virgil van Dijk', pos: 'ZAG', ovr: 89 },
      { name: 'Alexis Mac Allister', pos: 'MC', ovr: 86 },
    ],
  },
  {
    id: 'arsenal', name: 'Arsenal', shortName: 'ARS', wikiTitle: 'Arsenal_F.C.',
    country: 'ENG', leagueId: 'ENG_1', reputationStars: 3, squadAvgOvr: 85,
    youthAcademyName: 'Hale End Academy U21', youthQuality: 90,
    primaryColor: '#EF0107', secondaryColor: '#FFFFFF', pattern: 'solid',
    keyPlayers: [
      { name: 'Bukayo Saka', pos: 'PD', ovr: 88 },
      { name: 'Martin Ødegaard', pos: 'MEI', ovr: 89 },
      { name: 'William Saliba', pos: 'ZAG', ovr: 87 },
    ],
  },
  {
    id: 'chelsea', name: 'Chelsea', shortName: 'CHE', wikiTitle: 'Chelsea_F.C.',
    country: 'ENG', leagueId: 'ENG_1', reputationStars: 3, squadAvgOvr: 82,
    youthAcademyName: 'Cobham Academy U21', youthQuality: 91,
    primaryColor: '#034694', secondaryColor: '#FFFFFF', pattern: 'solid',
    keyPlayers: [{ name: 'Cole Palmer', pos: 'MEI', ovr: 86 }, { name: 'Moisés Caicedo', pos: 'VOL', ovr: 83 }],
  },
  {
    id: 'man_united', name: 'Manchester United', shortName: 'MUN', wikiTitle: 'Manchester_United_F.C.',
    country: 'ENG', leagueId: 'ENG_1', reputationStars: 3, squadAvgOvr: 81,
    youthAcademyName: 'Carrington Academy U21', youthQuality: 87,
    primaryColor: '#DA291C', secondaryColor: '#111111', pattern: 'solid',
    keyPlayers: [{ name: 'Bruno Fernandes', pos: 'MEI', ovr: 87 }, { name: 'Kobbie Mainoo', pos: 'MC', ovr: 79 }],
  },
  {
    id: 'aston_villa', name: 'Aston Villa', shortName: 'AVL', wikiTitle: 'Aston_Villa_F.C.',
    country: 'ENG', leagueId: 'ENG_1', reputationStars: 2, squadAvgOvr: 81,
    youthAcademyName: 'Bodymoor Heath U21', youthQuality: 82,
    primaryColor: '#670E36', secondaryColor: '#95BFE5', pattern: 'solid',
    keyPlayers: [{ name: 'Ollie Watkins', pos: 'ATA', ovr: 84 }, { name: 'Youri Tielemans', pos: 'MC', ovr: 82 }],
  },
  // EFL CHAMPIONSHIP (2ª DIV)
  {
    id: 'leeds', name: 'Leeds United', shortName: 'LEE', wikiTitle: 'Leeds_United_F.C.',
    country: 'ENG', leagueId: 'ENG_2', reputationStars: 2, squadAvgOvr: 75,
    youthAcademyName: 'Thorp Arch U21', youthQuality: 80,
    primaryColor: '#FFFFFF', secondaryColor: '#1D428A', pattern: 'solid',
    keyPlayers: [{ name: 'Wilfried Gnonto', pos: 'PE', ovr: 76 }, { name: 'Ethan Ampadu', pos: 'VOL', ovr: 76 }],
  },
  {
    id: 'sunderland', name: 'Sunderland', shortName: 'SUN', wikiTitle: 'Sunderland_A.F.C.',
    country: 'ENG', leagueId: 'ENG_2', reputationStars: 2, squadAvgOvr: 73,
    youthAcademyName: 'Academy of Light U21', youthQuality: 81,
    primaryColor: '#EB172B', secondaryColor: '#FFFFFF', pattern: 'stripes',
    keyPlayers: [{ name: 'Jobe Bellingham', pos: 'MC', ovr: 75 }, { name: 'Chris Rigg', pos: 'MEI', ovr: 72 }],
  },
  {
    id: 'burnley', name: 'Burnley', shortName: 'BUR', wikiTitle: 'Burnley_F.C.',
    country: 'ENG', leagueId: 'ENG_2', reputationStars: 2, squadAvgOvr: 74,
    youthAcademyName: 'Burnley Academy U21', youthQuality: 75,
    primaryColor: '#6C1D45', secondaryColor: '#99D6EA', pattern: 'solid',
    keyPlayers: [{ name: 'Josh Brownhill', pos: 'MC', ovr: 76 }],
  },
  {
    id: 'middlesbrough', name: 'Middlesbrough', shortName: 'MID', wikiTitle: 'Middlesbrough_F.C.',
    country: 'ENG', leagueId: 'ENG_2', reputationStars: 1, squadAvgOvr: 72,
    youthAcademyName: 'Rockliffe Park U21', youthQuality: 76,
    primaryColor: '#E11B22', secondaryColor: '#FFFFFF', pattern: 'hoops',
    keyPlayers: [{ name: 'Hayden Hackney', pos: 'MC', ovr: 74 }],
  },
  // MLS (DIVISÃO ÚNICA)
  {
    id: 'inter_miami', name: 'Inter Miami CF', shortName: 'MIA', wikiTitle: 'Inter_Miami_CF',
    country: 'USA', leagueId: 'USA_1', reputationStars: 3, squadAvgOvr: 78,
    youthAcademyName: 'Inter Miami CF II (MLS NEXT)', youthQuality: 78,
    primaryColor: '#F7B5CD', secondaryColor: '#231F20', pattern: 'solid',
    keyPlayers: [
      { name: 'Lionel Messi', pos: 'PD', ovr: 88 },
      { name: 'Luis Suárez', pos: 'ATA', ovr: 82 },
      { name: 'Sergio Busquets', pos: 'VOL', ovr: 81 },
      { name: 'Jordi Alba', pos: 'LE', ovr: 80 },
    ],
  },
  {
    id: 'la_galaxy', name: 'LA Galaxy', shortName: 'LAG', wikiTitle: 'LA_Galaxy',
    country: 'USA', leagueId: 'USA_1', reputationStars: 2, squadAvgOvr: 75,
    youthAcademyName: 'Ventura County MLS NEXT', youthQuality: 76,
    primaryColor: '#FFFFFF', secondaryColor: '#00245D', pattern: 'diagonal',
    keyPlayers: [{ name: 'Riqui Puig', pos: 'MEI', ovr: 80 }, { name: 'Marco Reus', pos: 'MEI', ovr: 80 }, { name: 'Gabriel Pec', pos: 'PD', ovr: 77 }],
  },
  {
    id: 'lafc', name: 'Los Angeles FC', shortName: 'LAFC', wikiTitle: 'Los_Angeles_FC',
    country: 'USA', leagueId: 'USA_1', reputationStars: 2, squadAvgOvr: 75,
    youthAcademyName: 'LAFC 2 Academy', youthQuality: 75,
    primaryColor: '#111111', secondaryColor: '#C39E6D', pattern: 'solid',
    keyPlayers: [{ name: 'Denis Bouanga', pos: 'PE', ovr: 80 }, { name: 'Olivier Giroud', pos: 'ATA', ovr: 78 }],
  },
  {
    id: 'columbus_crew', name: 'Columbus Crew', shortName: 'CLB', wikiTitle: 'Columbus_Crew',
    country: 'USA', leagueId: 'USA_1', reputationStars: 2, squadAvgOvr: 74,
    youthAcademyName: 'Crew 2 MLS NEXT', youthQuality: 74,
    primaryColor: '#FEDD00', secondaryColor: '#111111', pattern: 'solid',
    keyPlayers: [{ name: 'Diego Rossi', pos: 'PE', ovr: 77 }, { name: 'Darlington Nagbe', pos: 'MC', ovr: 76 }],
  },
  {
    id: 'seattle_sounders', name: 'Seattle Sounders', shortName: 'SEA', wikiTitle: 'Seattle_Sounders_FC',
    country: 'USA', leagueId: 'USA_1', reputationStars: 2, squadAvgOvr: 73,
    youthAcademyName: 'Tacoma Defiance Academy', youthQuality: 75,
    primaryColor: '#5D9741', secondaryColor: '#005595', pattern: 'solid',
    keyPlayers: [{ name: 'Jordan Morris', pos: 'ATA', ovr: 75 }, { name: 'Pedro de la Vega', pos: 'PD', ovr: 75 }],
  },
  {
    id: 'ny_red_bulls', name: 'NY Red Bulls', shortName: 'RBNY', wikiTitle: 'New_York_Red_Bulls',
    country: 'USA', leagueId: 'USA_1', reputationStars: 1, squadAvgOvr: 72,
    youthAcademyName: 'NY Red Bulls II Academy', youthQuality: 78,
    primaryColor: '#ED1E36', secondaryColor: '#FFFFFF', pattern: 'halves',
    keyPlayers: [{ name: 'Emil Forsberg', pos: 'MEI', ovr: 78 }],
  },
];
