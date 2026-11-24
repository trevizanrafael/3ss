import { getClubById } from '../../data/clubs';
import { clamp } from '../../shared/utils/math';
import { CareerPlayer } from '../player/playerTypes';

export type PenaltyCorner = 'ESQUERDA' | 'MEIO' | 'DIREITA';

export interface PenaltyKickLog {
  round: number;
  myScored: boolean;
  oppScored: boolean | null;
  isUserKick?: boolean;
}

export interface UserPenaltyShootoutSummary {
  myPenGoals: number;
  oppPenGoals: number;
  won: boolean;
  userConverted: boolean;
  chosenCorner: PenaltyCorner;
  keeperCorner: PenaltyCorner;
  kicks: PenaltyKickLog[];
}

function pickKeeperDive(): PenaltyCorner {
  const r = Math.random();
  if (r < 0.41) return 'ESQUERDA';
  if (r < 0.82) return 'DIREITA';
  return 'MEIO';
}

/**
 * Resolve a disputa interativa de pênaltis em que o jogador cobra a 1ª cobrança do seu time
 * escolhendo o canto, seguida pelas demais cobranças oficiais (5 + alternadas se necessário).
 */
export function resolveInteractiveShootout(
  player: CareerPlayer,
  myTeamId: string,
  oppTeamId: string,
  chosenCorner: PenaltyCorner,
): UserPenaltyShootoutSummary {
  const myClub = getClubById(myTeamId);
  const oppClub = getClubById(oppTeamId);

  const keeperCorner = pickKeeperDive();
  const shotSkill = (player.attributes.finishing * 0.6 + player.attributes.shotPower * 0.4) / 100;
  const sameCorner = chosenCorner === keeperCorner;

  // Se deslocou o goleiro, chance altíssima (86%..97%); se o goleiro acertou o canto, força/precisão ainda pode vencer!
  const userConvProb = sameCorner
    ? clamp(0.28 + shotSkill * 0.42, 0.3, 0.66)
    : clamp(0.82 + shotSkill * 0.16, 0.84, 0.97);

  const userConverted = Math.random() < userConvProb;

  const teamConvProb = clamp(
    0.75 + (myClub.squadAvgOvr - oppClub.squadAvgOvr) * 0.009,
    0.66,
    0.85,
  );
  const oppConvProb = clamp(
    0.74 + (oppClub.squadAvgOvr - myClub.squadAvgOvr) * 0.009,
    0.65,
    0.84,
  );

  let myPenGoals = 0;
  let oppPenGoals = 0;
  const kicks: PenaltyKickLog[] = [];

  for (let round = 1; round <= 5; round++) {
    const myScored = round === 1 ? userConverted : Math.random() < teamConvProb;
    if (myScored) myPenGoals++;

    const remMyAfterMe = 5 - round;
    const remOppBeforeOpp = 5 - round + 1;
    if (
      myPenGoals - oppPenGoals > remOppBeforeOpp ||
      oppPenGoals - myPenGoals > remMyAfterMe
    ) {
      kicks.push({
        round,
        myScored,
        oppScored: null,
        isUserKick: round === 1,
      });
      break;
    }

    const oppScored = Math.random() < oppConvProb;
    if (oppScored) oppPenGoals++;

    kicks.push({
      round,
      myScored,
      oppScored,
      isUserKick: round === 1,
    });

    const remAfterBoth = 5 - round;
    if (Math.abs(myPenGoals - oppPenGoals) > remAfterBoth) {
      break;
    }
  }

  let round = 6;
  while (myPenGoals === oppPenGoals && round <= 20) {
    const myScored = Math.random() < teamConvProb;
    const oppScored = Math.random() < oppConvProb;
    if (myScored) myPenGoals++;
    if (oppScored) oppPenGoals++;
    kicks.push({ round, myScored, oppScored });
    round++;
  }

  if (myPenGoals === oppPenGoals) {
    myPenGoals += 1;
    kicks.push({ round, myScored: true, oppScored: false });
  }

  return {
    myPenGoals,
    oppPenGoals,
    won: myPenGoals > oppPenGoals,
    userConverted,
    chosenCorner,
    keeperCorner,
    kicks,
  };
}
