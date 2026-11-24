import * as THREE from 'three';
import { ClubData } from '../../data/clubs/types';
import { CareerPlayer } from '../../domains/player/playerTypes';
import { playBallKickSfx } from '../audio/matchAudio';
import { BALL_AERO, BallState } from '../physics/ballPhysics';
import { PITCH } from '../physics/pitchConstants';
import {
  animatePitchActor,
  createPitchFootballerActor,
  PitchActorInstance,
  PitchPoseState,
} from './pitchActorRig';

export interface GoalkeeperBrain {
  actor: PitchActorInstance;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  diveTimer: number;
  diveDir: -1 | 0 | 1;
  holdBallTimer: number;
  smotherCooldown: number;
  fakeShotFreezeTimer: number;
  inSpreadStance: boolean;
}

export function createGoalkeeperAI(opponentClub: ClubData): GoalkeeperBrain {
  const gkKitClub: ClubData = {
    ...opponentClub,
    primaryColor: '#F59E0B',
    secondaryColor: '#111827',
    pattern: 'solid',
  };

  const gkProfile: CareerPlayer = {
    fullName: 'Goleiro Titular',
    shirtName: 'GOLEIRO',
    shirtNumber: 1,
    age: 27,
    birthDay: 10,
    birthMonth: 3,
    birthYear: 1999,
    nationality: opponentClub.country,
    startingLeagueCountry: 'BRA',
    position: 'ATA',
    preferredFoot: 'DIREITA',
    heightCm: 191,
    weightKg: 85,
    appearance: {
      skinTone: '#C68642',
      hairStyle: 'CURTO',
      hairColor: '#1F2937',
      facialHair: 'BARBA_BAIXA',
      eyeColor: '#3B2F2F',
      shirtTuck: 'DENTRO_CALCAO',
      sleeveStyle: 'LONGA',
      sockHeight: 'ALTO',
      accessory: 'LUVAS',
      bootColor: '#111827',
    },
    attributes: {
      acceleration: 80,
      sprintSpeed: 78,
      agility: 84,
      balance: 84,
      stamina: 82,
      strength: 85,
      finishing: 50,
      shotPower: 80,
      longShots: 50,
      positioning: 85,
      shortPass: 74,
      longPass: 80,
      dribbling: 55,
      ballControl: 74,
      tackling: 82,
      interceptions: 85,
    },
    attributeXp: {
      acceleration: 0, sprintSpeed: 0, agility: 0, balance: 0, stamina: 0, strength: 0,
      finishing: 0, shotPower: 0, longShots: 0, positioning: 0, shortPass: 0, longPass: 0,
      dribbling: 0, ballControl: 0, tackling: 0, interceptions: 0,
    },
    overall: opponentClub.squadAvgOvr,
    reputationStars: 2,
    stamina: 100,
    careerTotals: { matches: 0, goals: 0, assists: 0, threeStarMatches: 0, trophies: 0 },
  };

  const actor = createPitchFootballerActor(gkProfile, gkKitClub);
  const pos = new THREE.Vector3(0, 0, -PITCH.HALF_L + 0.85);
  actor.root.position.copy(pos);

  return {
    actor,
    pos,
    vel: new THREE.Vector3(),
    diveTimer: 0,
    diveDir: 0,
    holdBallTimer: 0,
    smotherCooldown: 0,
    fakeShotFreezeTimer: 0,
    inSpreadStance: false,
  };
}

export function stepGoalkeeperAI(
  gk: GoalkeeperBrain,
  ball: BallState,
  userPos: THREE.Vector3,
  triggeredFakeShotDirX: number | null,
  skillDifficulty01: number,
  dt: number,
  timeSec: number,
): { madeSave: boolean; caughtFirmly: boolean } {
  let madeSave = false;
  let caughtFirmly = false;
  const baseGoalZ = -PITCH.HALF_L + 0.72;
  gk.smotherCooldown = Math.max(0, gk.smotherCooldown - dt);
  gk.fakeShotFreezeTimer = Math.max(0, gk.fakeShotFreezeTimer - dt);

  // Fingir Chute (B->A) faz o goleiro plantar o pé pro lado falso por 0.34s!
  if (triggeredFakeShotDirX !== null && ball.pos.z < -28.0 && gk.fakeShotFreezeTimer <= 0) {
    gk.fakeShotFreezeTimer = 0.34;
    gk.vel.set(triggeredFakeShotDirX * 3.1, 0, 0);
  }

  // 1. Quando o goleiro encaixou a bola: caminha até a linha da pequena área e repõe!
  if (ball.ownerId === 'GK') {
    gk.inSpreadStance = false;
    gk.holdBallTimer -= dt;
    gk.diveDir = 0;
    const walkOutSpd = gk.pos.z < -PITCH.HALF_L + 3.2 ? 2.1 : 0;
    gk.pos.z = Math.min(-PITCH.HALF_L + 3.2, gk.pos.z + walkOutSpd * dt);
    ball.pos.set(gk.pos.x, 1.08, gk.pos.z + 0.42);
    ball.vel.set(0, 0, 0);
    ball.spin.set(0, 0, 0);
    ball.enteredGoalSide = null;
    if (gk.holdBallTimer <= 0) {
      ball.ownerId = null;
      ball.lastTouchBy = 'GK';
      ball.touchCooldown = 0.35;
      const aimZ = Math.max(-15, userPos.z);
      const toUser = new THREE.Vector3(userPos.x - gk.pos.x, 0, aimZ - gk.pos.z).normalize();
      ball.vel.set(toUser.x * 17.5, 4.0, toUser.z * 17.5);
      playBallKickSfx(0.62);
    }
    gk.actor.root.position.copy(gk.pos);
    gk.actor.root.rotation.y = 0;
    animatePitchActor(gk.actor, walkOutSpd > 0.2 ? 'RUN' : 'IDLE', walkOutSpd, 0, false, dt, timeSec);
    return { madeSave: false, caughtFirmly: false };
  }

  const distToBallHoriz = Math.hypot(ball.pos.x - gk.pos.x, ball.pos.z - gk.pos.z);

  if (gk.diveTimer > 0) {
    gk.inSpreadStance = false;
    gk.diveTimer -= dt;
    gk.pos.x += gk.vel.x * dt;
    gk.pos.z += gk.vel.z * dt;
    gk.pos.x = Math.max(-PITCH.GOAL_HALF_W - 0.85, Math.min(PITCH.GOAL_HALF_W + 0.85, gk.pos.x));
    gk.pos.z = Math.max(-PITCH.HALF_L + 0.35, Math.min(-PITCH.HALF_L + 11.5, gk.pos.z));
  } else if (gk.fakeShotFreezeTimer > 0) {
    gk.pos.x += gk.vel.x * dt;
    gk.vel.multiplyScalar(Math.max(0, 1 - 5.5 * dt));
  } else {
    gk.diveDir = 0;

    // 2. Posicionamento com INÉRCIA REAL DE PASSADA (não desliza mais como robô!) + AJOELHADA 1x1!
    const distBallFromGoal = Math.hypot(ball.pos.x, ball.pos.z - -PITCH.HALF_L);
    const attackerAdvancing = ball.vel.z < -0.9;
    const attackerIn1v1Close =
      (ball.ownerId === 'USER' || ball.ownerId === 'MATE') &&
      Math.abs(ball.pos.x) < 9.0 &&
      ball.pos.z < -32.8;

    const looseBallInSixYard =
      ball.ownerId === null &&
      Math.hypot(ball.vel.x, ball.vel.z) < 7.0 &&
      ball.pos.z < -35.5 &&
      Math.abs(ball.pos.x) < 7.5;

    let targetX: number;
    let targetZ: number;
    // Velocidade humana realista de passada lateral (4.7..5.6 m/s — se você girar rápido o jogo ou bater cruzado no canto oposto, vence ele!)
    let maxMoveSpd = 4.6 + skillDifficulty01 * 1.15;

    if ((attackerIn1v1Close && (ball.pos.z < -35.0 || attackerAdvancing)) || looseBallInSixYard) {
      maxMoveSpd = 5.8 + skillDifficulty01 * 1.1;
      targetX = ball.pos.x * 0.9;
      targetZ = Math.min(-PITCH.HALF_L + 7.8, ball.pos.z - 0.55);
      // Quando chega perto (dist < 6.5m no 1x1), sai de base / ajoelha em cruz fechando por baixo e abrindo a Cavadinha (LB+B)!
      gk.inSpreadStance = distToBallHoriz < 6.5;
    } else {
      gk.inSpreadStance = false;
      const maxStepOut = attackerAdvancing ? 3.8 : 2.3;
      const stepOutDist =
        ball.pos.z < -20
          ? Math.min(maxStepOut, Math.max(0.75, (1 - (distBallFromGoal - 7) / 22) * maxStepOut))
          : 0.75;
      const dirX = ball.pos.x / Math.max(1, distBallFromGoal);
      const dirZ = (ball.pos.z - -PITCH.HALF_L) / Math.max(1, distBallFromGoal);

      targetX = Math.max(
        -PITCH.GOAL_HALF_W + 0.45,
        Math.min(PITCH.GOAL_HALF_W - 0.45, dirX * (stepOutDist + 1.5)),
      );
      targetZ = Math.max(baseGoalZ, -PITCH.HALF_L + dirZ * stepOutDist);
    }

    // 3. Leitura de Chutes (se ele já estiver ajoelhado em GK_SPREAD_LOW no 1x1, não salta alto na cavadinha!)
    if (
      ball.ownerId === null &&
      ball.vel.z < -5.5 &&
      ball.pos.z < -4 &&
      ball.pos.z > -PITCH.HALF_L
    ) {
      const tHit = (gk.pos.z - ball.pos.z) / ball.vel.z;
      if (tHit > 0 && tHit < 1.2) {
        const yAtGk =
          ball.pos.y + ball.vel.y * tHit + 0.5 * BALL_AERO.GRAVITY * tHit * tHit;
        const magnusAx = ball.spin.y * ball.vel.z * BALL_AERO.MAGNUS_COEFF * 0.8;
        const predX = ball.pos.x + ball.vel.x * tHit + 0.5 * magnusAx * tHit * tHit * 0.82;

        if (Math.abs(predX) < PITCH.GOAL_HALF_W + 1.0) {
          targetX = Math.max(-PITCH.GOAL_HALF_W, Math.min(PITCH.GOAL_HALF_W, predX));
          const deltaX = predX - gk.pos.x;
          // Se não estiver travado na ajoelhada de 1x1 e o chute vier nos cantos, salta em ponte!
          if (!gk.inSpreadStance && Math.abs(deltaX) > 0.88 && tHit < 0.52 && yAtGk < 2.48) {
            gk.diveDir = deltaX < 0 ? -1 : 1;
            gk.diveTimer = 0.46;
            gk.vel.set(gk.diveDir * (5.9 + skillDifficulty01 * 2.1), 0, 0);
          }
        }
      }
    }

    // Aceleração física com inércia (precisa apoiar o pé e acelerar, zero teleporte/deslize!)
    if (gk.diveTimer <= 0) {
      const dx = targetX - gk.pos.x;
      const dz = targetZ - gk.pos.z;
      const d = Math.hypot(dx, dz);
      const wishSpd = d > 0.06 ? Math.min(maxMoveSpd, d * 6.5) : 0;
      const wishVx = d > 0.06 ? (dx / d) * wishSpd : 0;
      const wishVz = d > 0.06 ? (dz / d) * wishSpd : 0;

      const accel = 15.0;
      gk.vel.x += (wishVx - gk.vel.x) * Math.min(1, accel * dt);
      gk.vel.z += (wishVz - gk.vel.z) * Math.min(1, accel * dt);
      gk.pos.addScaledVector(gk.vel, dt);
    }
  }

  // 4. Abafa nos pés 1x1 se você bater de frente nele sem cavar (LB+B) nem cortar (B->A)!
  const currDistHoriz = Math.hypot(ball.pos.x - gk.pos.x, ball.pos.z - gk.pos.z);
  if (
    (ball.ownerId === 'USER' || ball.ownerId === 'MATE') &&
    gk.smotherCooldown <= 0 &&
    currDistHoriz < 1.24 &&
    ball.pos.y < 1.25
  ) {
    madeSave = true;
    gk.smotherCooldown = 0.85;
    gk.diveDir = ball.pos.x < gk.pos.x ? -1 : 1;
    gk.diveTimer = 0.32;
    gk.vel.set(0, 0, 0);
    playBallKickSfx(0.7);

    if (Math.random() < 0.55) {
      caughtFirmly = true;
      ball.ownerId = 'GK';
      ball.lastTouchBy = 'GK';
      gk.holdBallTimer = 0.9;
    } else {
      const pushX = ball.pos.x >= gk.pos.x ? 1 : -1;
      ball.ownerId = null;
      ball.lastTouchBy = 'GK';
      ball.touchCooldown = 0.32;
      ball.vel.set(pushX * 8.5, 1.8, 5.5);
    }
  } else if (
    // 5. Defesa de Chutes: Chutes fortes ESPALMAM gerando rebote; só chutes fracos/no peito ele encaixa!
    ball.ownerId === null &&
    ball.touchCooldown <= 0.19 &&
    ball.pos.z > -PITCH.HALF_L - 0.1
  ) {
    // Se estiver ajoelhado em GK_SPREAD_LOW, fecha largo embaixo (1.38m) mas baixinho em cima (1.18m = Cavadinha passa!)
    const reachX = gk.inSpreadStance ? 1.38 : gk.diveTimer > 0 ? 1.38 : 0.88;
    const reachZ = 0.86;
    const reachY = gk.inSpreadStance ? 1.18 : gk.diveTimer > 0 ? 2.38 : 2.28;
    const dx = Math.abs(ball.pos.x - gk.pos.x);
    const dz = Math.abs(ball.pos.z - gk.pos.z);

    const movingTowardGoalOrLooseClose =
      ball.vel.z < -1.0 || (currDistHoriz < 0.95 && ball.pos.z < -33);

    if (dx < reachX && dz < reachZ && ball.pos.y < reachY && movingTowardGoalOrLooseClose) {
      madeSave = true;
      const shotSpeed = ball.vel.length();
      playBallKickSfx(0.7);

      // Relação realista entre Força do Chute e Espalmar vs Encaixar:
      // - Chute forte (>= 23.5 m/s) ou ponte aérea (diveTimer > 0) ou longe do tronco -> ESPALMA (rebote vivo!)
      // - Só encaixa se for chute fraco/médio (< 22.0 m/s) perto do peito e em pé!
      let catchChance = 0;
      if (shotSpeed < 19.5 && gk.diveTimer <= 0 && !gk.inSpreadStance) {
        catchChance = 0.82;
      } else if (shotSpeed < 23.5 && dx < 0.48 && gk.diveTimer <= 0 && !gk.inSpreadStance) {
        catchChance = 0.48;
      } else if (shotSpeed < 25.0 && dx < 0.38 && gk.diveTimer <= 0) {
        catchChance = 0.22;
      } else {
        catchChance = 0.05; // Bombas quase sempre espalmam!
      }

      if (Math.random() < catchChance) {
        caughtFirmly = true;
        ball.ownerId = 'GK';
        ball.lastTouchBy = 'GK';
        gk.holdBallTimer = 0.95;
      } else {
        // ESPALMADA COM REBOTE REALISTA EM CAMPO!
        const pushSide =
          Math.abs(ball.pos.x - gk.pos.x) > 0.18
            ? ball.pos.x >= gk.pos.x
              ? 1
              : -1
            : Math.random() < 0.5
              ? -1
              : 1;
        ball.lastTouchBy = 'GK';
        ball.touchCooldown = 0.26;
        const reboundSideSpd = 5.8 + Math.random() * 5.2;
        const reboundOutZ = 3.8 + Math.min(6.5, Math.abs(ball.vel.z) * 0.26);
        ball.vel.set(pushSide * reboundSideSpd, 1.8 + Math.random() * 2.4, reboundOutZ);
        ball.spin.multiplyScalar(0.3);
      }
    }
  }

  gk.actor.root.position.copy(gk.pos);
  gk.actor.root.rotation.y = Math.atan2(ball.pos.x - gk.pos.x, ball.pos.z - gk.pos.z) * 0.42;

  const gkSpd = Math.hypot(gk.vel.x, gk.vel.z);
  const pose: PitchPoseState =
    gk.diveDir === -1
      ? 'GK_DIVE_LEFT'
      : gk.diveDir === 1
        ? 'GK_DIVE_RIGHT'
        : gk.inSpreadStance
          ? 'GK_SPREAD_LOW'
          : gkSpd > 3.2
            ? 'RUN'
            : 'GK_READY';
  animatePitchActor(gk.actor, pose, gkSpd, 0, false, dt, timeSec);

  return { madeSave, caughtFirmly };
}
