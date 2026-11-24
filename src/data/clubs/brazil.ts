import { ClubData } from './types';

export const BRAZIL_CLUBS: ClubData[] = [
  // SÉRIE A
  {
    id: 'flamengo', name: 'Flamengo', shortName: 'FLA', wikiTitle: 'CR_Flamengo',
    country: 'BRA', leagueId: 'BRA_1', reputationStars: 3, squadAvgOvr: 80,
    youthAcademyName: 'Ninho do Urubu Sub-20', youthQuality: 86,
    primaryColor: '#C52613', secondaryColor: '#111111', pattern: 'hoops',
    keyPlayers: [
      { name: 'Pedro', pos: 'ATA', ovr: 82 },
      { name: 'Arrascaeta', pos: 'MEI', ovr: 83 },
      { name: 'Gerson', pos: 'MC', ovr: 81 },
      { name: 'Léo Ortiz', pos: 'ZAG', ovr: 79 },
    ],
  },
  {
    id: 'palmeiras', name: 'Palmeiras', shortName: 'PAL', wikiTitle: 'Sociedade_Esportiva_Palmeiras',
    country: 'BRA', leagueId: 'BRA_1', reputationStars: 3, squadAvgOvr: 80,
    youthAcademyName: 'Academia de Futebol Sub-20', youthQuality: 90,
    primaryColor: '#006437', secondaryColor: '#FFFFFF', pattern: 'solid',
    keyPlayers: [
      { name: 'Estêvão', pos: 'PD', ovr: 81 },
      { name: 'Raphael Veiga', pos: 'MEI', ovr: 81 },
      { name: 'Gustavo Gómez', pos: 'ZAG', ovr: 80 },
      { name: 'Vitor Roque', pos: 'ATA', ovr: 79 },
    ],
  },
  {
    id: 'botafogo', name: 'Botafogo', shortName: 'BOT', wikiTitle: 'Botafogo_de_Futebol_e_Regatas',
    country: 'BRA', leagueId: 'BRA_1', reputationStars: 3, squadAvgOvr: 78,
    youthAcademyName: 'Base Alvinegra Sub-20', youthQuality: 78,
    primaryColor: '#111111', secondaryColor: '#FFFFFF', pattern: 'stripes',
    keyPlayers: [
      { name: 'Igor Jesus', pos: 'ATA', ovr: 79 },
      { name: 'Savarino', pos: 'PE', ovr: 79 },
      { name: 'Marlon Freitas', pos: 'VOL', ovr: 78 },
      { name: 'Bastos', pos: 'ZAG', ovr: 78 },
    ],
  },
  {
    id: 'sao_paulo', name: 'São Paulo', shortName: 'SAO', wikiTitle: 'São_Paulo_FC',
    country: 'BRA', leagueId: 'BRA_1', reputationStars: 3, squadAvgOvr: 77,
    youthAcademyName: 'CFA Cotia Sub-20', youthQuality: 88,
    primaryColor: '#FE0000', secondaryColor: '#FFFFFF', pattern: 'hoops',
    keyPlayers: [
      { name: 'Lucas Moura', pos: 'PD', ovr: 81 },
      { name: 'Oscar', pos: 'MEI', ovr: 80 },
      { name: 'Calleri', pos: 'ATA', ovr: 79 },
      { name: 'Arboleda', pos: 'ZAG', ovr: 78 },
    ],
  },
  {
    id: 'corinthians', name: 'Corinthians', shortName: 'COR', wikiTitle: 'Sport_Club_Corinthians_Paulista',
    country: 'BRA', leagueId: 'BRA_1', reputationStars: 3, squadAvgOvr: 77,
    youthAcademyName: 'Terrão Sub-20', youthQuality: 83,
    primaryColor: '#FFFFFF', secondaryColor: '#111111', pattern: 'solid',
    keyPlayers: [
      { name: 'Memphis Depay', pos: 'ATA', ovr: 82 },
      { name: 'Rodrigo Garro', pos: 'MEI', ovr: 81 },
      { name: 'Yuri Alberto', pos: 'ATA', ovr: 79 },
    ],
  },
  {
    id: 'internacional', name: 'Internacional', shortName: 'INT', wikiTitle: 'Sport_Club_Internacional',
    country: 'BRA', leagueId: 'BRA_1', reputationStars: 3, squadAvgOvr: 77,
    youthAcademyName: 'Celeiro de Ases Sub-20', youthQuality: 84,
    primaryColor: '#E5050F', secondaryColor: '#FFFFFF', pattern: 'solid',
    keyPlayers: [
      { name: 'Alan Patrick', pos: 'MEI', ovr: 80 },
      { name: 'Enner Valencia', pos: 'ATA', ovr: 78 },
      { name: 'Vitão', pos: 'ZAG', ovr: 78 },
    ],
  },
  {
    id: 'cruzeiro', name: 'Cruzeiro', shortName: 'CRU', wikiTitle: 'Cruzeiro_Esporte_Clube',
    country: 'BRA', leagueId: 'BRA_1', reputationStars: 2, squadAvgOvr: 76,
    youthAcademyName: 'Toca da Raposa Sub-20', youthQuality: 83,
    primaryColor: '#003A94', secondaryColor: '#FFFFFF', pattern: 'solid',
    keyPlayers: [
      { name: 'Matheus Pereira', pos: 'MEI', ovr: 80 },
      { name: 'Gabigol', pos: 'ATA', ovr: 79 },
      { name: 'Kaio Jorge', pos: 'ATA', ovr: 76 },
    ],
  },
  {
    id: 'gremio', name: 'Grêmio', shortName: 'GRE', wikiTitle: 'Grêmio_Foot-Ball_Porto_Alegrense',
    country: 'BRA', leagueId: 'BRA_1', reputationStars: 3, squadAvgOvr: 76,
    youthAcademyName: 'CT Eldorado Sub-20', youthQuality: 82,
    primaryColor: '#0D80BF', secondaryColor: '#111111', pattern: 'stripes',
    keyPlayers: [
      { name: 'Braithwaite', pos: 'ATA', ovr: 78 },
      { name: 'Villasanti', pos: 'VOL', ovr: 79 },
      { name: 'Cristaldo', pos: 'MEI', ovr: 77 },
    ],
  },
  // SÉRIE B (Ideais para começar com 1-2 estrelas na Peneira ou ir por Empréstimo!)
  {
    id: 'coritiba', name: 'Coritiba', shortName: 'CFC', wikiTitle: 'Coritiba_Foot_Ball_Club',
    country: 'BRA', leagueId: 'BRA_2', reputationStars: 2, squadAvgOvr: 70,
    youthAcademyName: 'CT Graciosa Sub-20', youthQuality: 76,
    primaryColor: '#005426', secondaryColor: '#FFFFFF', pattern: 'hoops',
    keyPlayers: [{ name: 'Josué', pos: 'MEI', ovr: 72 }, { name: 'Sebastián Gómez', pos: 'VOL', ovr: 72 }],
  },
  {
    id: 'criciuma', name: 'Criciúma', shortName: 'CRI', wikiTitle: 'Criciúma_Esporte_Clube',
    country: 'BRA', leagueId: 'BRA_2', reputationStars: 1, squadAvgOvr: 69,
    youthAcademyName: 'Base Tigre Sub-20', youthQuality: 72,
    primaryColor: '#FDD116', secondaryColor: '#111111', pattern: 'hoops',
    keyPlayers: [{ name: 'Fellipe Mateus', pos: 'MC', ovr: 71 }, { name: 'Rodrigo', pos: 'ZAG', ovr: 70 }],
  },
  {
    id: 'goias', name: 'Goiás', shortName: 'GOI', wikiTitle: 'Goiás_Esporte_Clube',
    country: 'BRA', leagueId: 'BRA_2', reputationStars: 2, squadAvgOvr: 70,
    youthAcademyName: 'Serrinha Sub-20', youthQuality: 74,
    primaryColor: '#006837', secondaryColor: '#FFFFFF', pattern: 'solid',
    keyPlayers: [{ name: 'Tadeu', pos: 'ZAG', ovr: 72 }, { name: 'Marcão', pos: 'VOL', ovr: 70 }],
  },
  {
    id: 'america_mg', name: 'América-MG', shortName: 'AME', wikiTitle: 'América_Futebol_Clube_(MG)',
    country: 'BRA', leagueId: 'BRA_2', reputationStars: 2, squadAvgOvr: 70,
    youthAcademyName: 'CT Lanna Drumond Sub-20', youthQuality: 77,
    primaryColor: '#008040', secondaryColor: '#111111', pattern: 'stripes',
    keyPlayers: [{ name: 'Benítez', pos: 'MEI', ovr: 73 }, { name: 'Fabinho', pos: 'PD', ovr: 71 }],
  },
  {
    id: 'novorizontino', name: 'Novorizontino', shortName: 'NOV', wikiTitle: 'Grêmio_Novorizontino',
    country: 'BRA', leagueId: 'BRA_2', reputationStars: 1, squadAvgOvr: 68,
    youthAcademyName: 'Base do Tigre Sub-20', youthQuality: 71,
    primaryColor: '#FACC15', secondaryColor: '#111111', pattern: 'stripes',
    keyPlayers: [{ name: 'Waguininho', pos: 'PE', ovr: 69 }, { name: 'Marlon', pos: 'VOL', ovr: 69 }],
  },
  {
    id: 'athletico_pr', name: 'Athletico-PR', shortName: 'CAP', wikiTitle: 'Club_Athletico_Paranaense',
    country: 'BRA', leagueId: 'BRA_2', reputationStars: 2, squadAvgOvr: 73,
    youthAcademyName: 'CAT Caju Sub-20', youthQuality: 84,
    primaryColor: '#CC0000', secondaryColor: '#111111', pattern: 'diagonal',
    keyPlayers: [{ name: 'Zapelli', pos: 'MEI', ovr: 75 }, { name: 'Mastriani', pos: 'ATA', ovr: 74 }],
  },
];
