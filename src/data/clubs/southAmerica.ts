import { ClubData } from './types';

export const SOUTH_AMERICA_CLUBS: ClubData[] = [
  // ARGENTINA 1ª DIVISÃO
  {
    id: 'river_plate', name: 'River Plate', shortName: 'RIV', wikiTitle: 'Club_Atlético_River_Plate',
    country: 'ARG', leagueId: 'ARG_1', reputationStars: 3, squadAvgOvr: 79,
    youthAcademyName: 'River Camp Reserva', youthQuality: 90,
    primaryColor: '#FFFFFF', secondaryColor: '#E4002B', pattern: 'diagonal',
    keyPlayers: [
      { name: 'Franco Mastantuono', pos: 'MEI', ovr: 78 },
      { name: 'Miguel Borja', pos: 'ATA', ovr: 79 },
      { name: 'Germán Pezzella', pos: 'ZAG', ovr: 79 },
    ],
  },
  {
    id: 'boca_juniors', name: 'Boca Juniors', shortName: 'BOC', wikiTitle: 'Boca_Juniors',
    country: 'ARG', leagueId: 'ARG_1', reputationStars: 3, squadAvgOvr: 78,
    youthAcademyName: 'Boca Predio Reserva', youthQuality: 88,
    primaryColor: '#003399', secondaryColor: '#FFCC00', pattern: 'hoops',
    keyPlayers: [
      { name: 'Edinson Cavani', pos: 'ATA', ovr: 79 },
      { name: 'Kevin Zenón', pos: 'ME', ovr: 78 },
      { name: 'Miguel Merentiel', pos: 'ATA', ovr: 78 },
    ],
  },
  {
    id: 'racing', name: 'Racing Club', shortName: 'RAC', wikiTitle: 'Racing_Club_de_Avellaneda',
    country: 'ARG', leagueId: 'ARG_1', reputationStars: 3, squadAvgOvr: 77,
    youthAcademyName: 'Predio Tita Mattiussi', youthQuality: 82,
    primaryColor: '#6CABDD', secondaryColor: '#FFFFFF', pattern: 'stripes',
    keyPlayers: [{ name: 'Adrián Martínez', pos: 'ATA', ovr: 79 }, { name: 'Juan Nardoni', pos: 'MC', ovr: 77 }],
  },
  {
    id: 'velez', name: 'Vélez Sarsfield', shortName: 'VEL', wikiTitle: 'Club_Atlético_Vélez_Sarsfield',
    country: 'ARG', leagueId: 'ARG_1', reputationStars: 2, squadAvgOvr: 75,
    youthAcademyName: 'La Fábrica Vélez', youthQuality: 86,
    primaryColor: '#FFFFFF', secondaryColor: '#004B87', pattern: 'diagonal',
    keyPlayers: [{ name: 'Braian Romero', pos: 'ATA', ovr: 76 }, { name: 'Valentín Gómez', pos: 'ZAG', ovr: 77 }],
  },
  {
    id: 'independiente', name: 'Independiente', shortName: 'IND', wikiTitle: 'Club_Atlético_Independiente',
    country: 'ARG', leagueId: 'ARG_1', reputationStars: 2, squadAvgOvr: 74,
    youthAcademyName: 'Villa Domínico Reserva', youthQuality: 79,
    primaryColor: '#D81920', secondaryColor: '#FFFFFF', pattern: 'solid',
    keyPlayers: [{ name: 'Gabriel Ávalos', pos: 'ATA', ovr: 75 }, { name: 'Kevin Lomónaco', pos: 'ZAG', ovr: 76 }],
  },
  {
    id: 'estudiantes', name: 'Estudiantes LP', shortName: 'EST', wikiTitle: 'Estudiantes_de_La_Plata',
    country: 'ARG', leagueId: 'ARG_1', reputationStars: 2, squadAvgOvr: 75,
    youthAcademyName: 'Country City Bell', youthQuality: 81,
    primaryColor: '#E30613', secondaryColor: '#FFFFFF', pattern: 'stripes',
    keyPlayers: [{ name: 'Santiago Ascacíbar', pos: 'VOL', ovr: 78 }, { name: 'Guido Carrillo', pos: 'ATA', ovr: 76 }],
  },
  // ARGENTINA 2ª DIVISÃO
  {
    id: 'colon', name: 'Colón de Santa Fe', shortName: 'COL', wikiTitle: 'Club_Atlético_Colón',
    country: 'ARG', leagueId: 'ARG_2', reputationStars: 1, squadAvgOvr: 69,
    youthAcademyName: 'Inferiores Sabalero', youthQuality: 72,
    primaryColor: '#DA291C', secondaryColor: '#111111', pattern: 'halves',
    keyPlayers: [{ name: 'Christian Bernardi', pos: 'MC', ovr: 70 }],
  },
  {
    id: 'quilmes', name: 'Quilmes', shortName: 'QUI', wikiTitle: 'Quilmes_Atlético_Club',
    country: 'ARG', leagueId: 'ARG_2', reputationStars: 1, squadAvgOvr: 67,
    youthAcademyName: 'Semillero Cervecero', youthQuality: 70,
    primaryColor: '#FFFFFF', secondaryColor: '#002B5C', pattern: 'solid',
    keyPlayers: [{ name: 'Federico Allende', pos: 'LD', ovr: 68 }],
  },
  {
    id: 'chacarita', name: 'Chacarita Juniors', shortName: 'CHA', wikiTitle: 'Chacarita_Juniors',
    country: 'ARG', leagueId: 'ARG_2', reputationStars: 1, squadAvgOvr: 67,
    youthAcademyName: 'Inferiores Funebrero', youthQuality: 69,
    primaryColor: '#E30613', secondaryColor: '#111111', pattern: 'stripes',
    keyPlayers: [{ name: 'Víctor Figueroa', pos: 'MEI', ovr: 69 }],
  },
  {
    id: 'ferro_carril', name: 'Ferro Carril Oeste', shortName: 'FCO', wikiTitle: 'Ferro_Carril_Oeste',
    country: 'ARG', leagueId: 'ARG_2', reputationStars: 1, squadAvgOvr: 67,
    youthAcademyName: 'Caballito Juveniles', youthQuality: 71,
    primaryColor: '#007A33', secondaryColor: '#FFFFFF', pattern: 'solid',
    keyPlayers: [{ name: 'Ricky Blanco', pos: 'MEI', ovr: 68 }],
  },
  // PRINCIPAIS CLUBES CONMEBOL (PARA LIBERTADORES & SUL-AMERICANA)
  {
    id: 'penarol', name: 'Peñarol', shortName: 'PEN', wikiTitle: 'Club_Atlético_Peñarol',
    country: 'ARG', leagueId: 'CONMEBOL_POOL', reputationStars: 2, squadAvgOvr: 75,
    youthAcademyName: 'Juveniles Carboneros', youthQuality: 80,
    primaryColor: '#FFCC00', secondaryColor: '#111111', pattern: 'stripes',
    keyPlayers: [{ name: 'Leo Fernández', pos: 'MEI', ovr: 79 }],
  },
  {
    id: 'nacional_uru', name: 'Nacional (URU)', shortName: 'NAC', wikiTitle: 'Club_Nacional_de_Football',
    country: 'ARG', leagueId: 'CONMEBOL_POOL', reputationStars: 2, squadAvgOvr: 74,
    youthAcademyName: 'Los Céspedes Juveniles', youthQuality: 80,
    primaryColor: '#FFFFFF', secondaryColor: '#0033A0', pattern: 'solid',
    keyPlayers: [{ name: 'Sebastián Coates', pos: 'ZAG', ovr: 77 }],
  },
  {
    id: 'colo_colo', name: 'Colo-Colo', shortName: 'CC', wikiTitle: 'Colo-Colo',
    country: 'ARG', leagueId: 'CONMEBOL_POOL', reputationStars: 2, squadAvgOvr: 74,
    youthAcademyName: 'Casa Alba Sub-20', youthQuality: 76,
    primaryColor: '#FFFFFF', secondaryColor: '#111111', pattern: 'solid',
    keyPlayers: [{ name: 'Arturo Vidal', pos: 'MC', ovr: 76 }],
  },
  {
    id: 'ind_del_valle', name: 'Independiente del Valle', shortName: 'IDV', wikiTitle: 'Independiente_del_Valle',
    country: 'ARG', leagueId: 'CONMEBOL_POOL', reputationStars: 2, squadAvgOvr: 75,
    youthAcademyName: 'Academia IDV', youthQuality: 89,
    primaryColor: '#002D72', secondaryColor: '#111111', pattern: 'stripes',
    keyPlayers: [{ name: 'Kendry Páez', pos: 'MEI', ovr: 76 }],
  },
];
