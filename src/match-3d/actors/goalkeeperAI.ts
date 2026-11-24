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
      acceleration: 82,
      sprintSpeed: 80,
      agility: 86,
      balance: 84,
      stamina: 82,
      strength: 85,
      finishing: 50,
      shotPower: 80,
      longShots: 50,
      positioning: 86,
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

  // Se o atacante deu um Fingir Chute (B+A) perto da área, o goleiro dá aquela ameaçada/plantada no pé de apoio!
  if (triggeredFakeShotDirX !== null && ball.pos.z < -28.5 && gk.fakeShotFreezeTimer <= 0) {
    gk.fakeShotFreezeTimer = 0.28;
    gk.vel.set(triggeredFakeShotDirX * 2.6, 0, 0);
  }

  // 1. Quando o goleiro AGARRA / ENCAIXA a bola: segura 0.9s e repõe pro jogo!
  if (ball.ownerId === 'GK') {
    gk.holdBallTimer -= dt;
    gk.diveDir = 0;
    gk.pos.z = Math.min(-PITCH.HALF_L + 3.4, gk.pos.z + 2.0 * dt);
    ball.pos.set(gk.pos.x, 1.08, gk.pos.z + 0.42);
    ball.vel.set(0, 0, 0);
    ball.spin.set(0, 0, 0);
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
    animatePitchActor(gk.actor, 'IDLE', 0, 0, false, dt, timeSec);
    return { madeSave: false, caughtFirmly: false };
  }

  if (gk.diveTimer > 0) {
    gk.diveTimer -= dt;
    gk.pos.x += gk.vel.x * dt;
    gk.pos.z += gk.vel.z * dt;
    gk.pos.x = Math.max(-PITCH.GOAL_HALF_W - 0.85, Math.min(PITCH.GOAL_HALF_W + 0.85, gk.pos.x));
    gk.pos.z = Math.max(-PITCH.HALF_L + 0.35, Math.min(-PITCH.HALF_L + 11.5, gk.pos.z));
  } else if (gk.fakeShotFreezeTimer > 0) {
    gk.pos.x += gk.vel.x * dt;
    gk.vel.multiplyScalar(Math.max(0, 1 - 6 * dt));
  } else {
    gk.diveDir = 0;

    // 2. Posicionamento 1x1 Inteligente:
    // - NÃO cai na isca se você puxar a bola pra trás (vel.z > -0.4)! Ele recua mantendo a bissetriz fechada!
    // - Só dá o bote de abafar nos pés dentro da zona mortal (z < -35.2) ou se você avançar de frente pra ele!
    const leadBallX = ball.pos.x + ball.vel.x * 0.16;
    const distBallFromGoal = Math.hypot(leadBallX, ball.pos.z - -PITCH.HALF_L);
    const attackerAdvancingTowardGoal = ball.vel.z < -1.1;

    const commitRushSmother =
      ((ball.ownerId === 'USER' || ball.ownerId === 'MATE') &&
        Math.abs(ball.pos.x) < 9.5 &&
        (ball.pos.z < -35.4 || (ball.pos.z < -32.2 && attackerAdvancingTowardGoal))) ||
      (ball.ownerId === null &&
        Math.hypot(ball.vel.x, ball.vel.z) < 7.5 &&
        ball.pos.z < -35.5 &&
        Math.abs(ball.pos.x) < 7.5);

    let targetX: number;
    let targetZ: number;
    let maxMoveSpd = 6.2 + skillDifficulty01 * 2.1;

    if (commitRushSmother) {
      maxMoveSpd = 7.4 + skillDifficulty01 * 1.4;
      targetX = leadBallX * 0.92;
      targetZ = Math.min(-PITCH.HALF_L + 8.5, ball.pos.z - 0.25);
    } else {
      // Bissetriz disciplinada: se o atacante recuar, o goleiro recompõe rápido pro gol fechando o ângulo!
      const maxStepOut = attackerAdvancingTowardGoal ? 4.2 : 2.5;
      const stepOutDist =
        ball.pos.z < -20
          ? Math.min(maxStepOut, Math.max(0.75, (1 - (distBallFromGoal - 7) / 22) * maxStepOut))
          : 0.75;
      const dirX = leadBallX / Math.max(1, distBallFromGoal);
      const dirZ = (ball.pos.z - -PITCH.HALF_L) / Math.max(1, distBallFromGoal);

      targetX = Math.max(
        -PITCH.GOAL_HALF_W + 0.35,
        Math.min(PITCH.GOAL_HALF_W - 0.35, dirX * (stepOutDist + 1.65)),
      );
      targetZ = Math.max(baseGoalZ, -PITCH.HALF_L + dirZ * stepOutDist);
    }

    // 3. Leitura precisa de Chute Direto, Curva Colocada (Magnus) e Cavadinha!
    if (
      ball.ownerId === null &&
      ball.vel.z < -5.5 &&
      ball.pos.z < -4 &&
      ball.pos.z > -PITCH.HALF_L
    ) {
      // Se for bola alta encobrindo (cavadinha), o goleiro tenta recuar rápido p/ linha do gol!
      const yAtGk =
        ball.pos.y +
        ball.vel.y * Math.max(0, (gk.pos.z - ball.pos.z) / ball.vel.z) +
        0.5 * BALL_AERO.GRAVITY * Math.max(0, (gk.pos.z - ball.pos.z) / ball.vel.z) ** 2;

      if (yAtGk > 2.25 && gk.pos.z > baseGoalZ + 0.5) {
        targetZ = baseGoalZ;
        maxMoveSpd = 7.8;
      }

      const interceptZ = yAtGk > 2.25 ? baseGoalZ : gk.pos.z;
      const tHit = (interceptZ - ball.pos.z) / ball.vel.z;
      if (tHit > 0 && tHit < 1.25) {
        const magnusAx = ball.spin.y * ball.vel.z * BALL_AERO.MAGNUS_COEFF * 0.78;
        // Lê 88% da curva no ar (chute colocado frouxo ou sem ângulo ele busca na gaveta!)
        const predX = ball.pos.x + ball.vel.x * tHit + 0.5 * magnusAx * tHit * tHit * 0.88;
        if (Math.abs(predX) < PITCH.GOAL_HALF_W + 1.1) {
          targetX = Math.max(-PITCH.GOAL_HALF_W, Math.min(PITCH.GOAL_HALF_W, predX));
          const deltaX = predX - gk.pos.x;
          if (Math.abs(deltaX) > 0.88 && tHit < 0.56 && yAtGk < 2.55) {
            gk.diveDir = deltaX < 0 ? -1 : 1;
            gk.diveTimer = 0.46;
            gk.vel.set(gk.diveDir * (6.2 + skillDifficulty01 * 2.3), 0, 0);
          }
        }
      }
    }

    if (gk.diveTimer <= 0) {
      const dx = targetX - gk.pos.x;
      const dz = targetZ - gk.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.04) {
        const spd = Math.min(maxMoveSpd, d * 9.5);
        gk.vel.set((dx / d) * spd, 0, (dz / d) * spd);
        gk.pos.addScaledVector(gk.vel, dt);
      } else {
        gk.vel.set(0, 0, 0);
      }
    }
  }

  // 4. ABAFA NOS PÉS 1x1 (encaixa firme a maioria das divididas nos pés!)
  const distToBallHoriz = Math.hypot(ball.pos.x - gk.pos.x, ball.pos.z - gk.pos.z);
  if (
    (ball.ownerId === 'USER' || ball.ownerId === 'MATE') &&
    gk.smotherCooldown <= 0 &&
    distToBallHoriz < 1.32 &&
    ball.pos.y < 1.45
  ) {
    madeSave = true;
    gk.smotherCooldown = 0.85;
    gk.diveDir = ball.pos.x < gk.pos.x ? -1 : 1;
    gk.diveTimer = 0.32;
    gk.vel.set(0, 0, 0);
    playBallKickSfx(0.7);

    if (Math.random() < 0.78) {
      caughtFirmly = true;
      ball.ownerId = 'GK';
      ball.lastTouchBy = 'GK';
      gk.holdBallTimer = 0.9;
    } else {
      const pushX = ball.pos.x >= gk.pos.x ? 1 : -1;
      ball.ownerId = null;
      ball.lastTouchBy = 'GK';
      ball.touchCooldown = 0.35;
      ball.vel.set(pushX * 11.5, 2.0, 7.5);
    }
  } else if (
    // 5. Defesa de Chutes: AGARRA FIRME chutes no corpo/mãos ou velocidade média; só espalma bombas no canto extremo!
    ball.ownerId === null &&
    ball.touchCooldown <= 0.19 &&
    ball.pos.z > -PITCH.HALF_L - 0.15
  ) {
    const reachX = gk.diveTimer > 0 ? 1.44 : 0.95;
    const reachZ = gk.diveTimer > 0 ? 0.9 : 0.86;
    const reachY = gk.diveTimer > 0 ? 2.42 : 2.34;
    const dx = Math.abs(ball.pos.x - gk.pos.x);
    const dz = Math.abs(ball.pos.z - gk.pos.z);

    const movingTowardGoalOrLooseClose =
      ball.vel.z < -1.0 || (distToBallHoriz < 1.0 && ball.pos.z < -33);

    if (dx < reachX && dz < reachZ && ball.pos.y < reachY && movingTowardGoalOrLooseClose) {
      madeSave = true;
      const shotSpeed = ball.vel.length();
      playBallKickSfx(0.68);

      // Agarra firme se vier perto do tronco/mãos (dx < 0.82), se for chute colocado/médio (< 26.5 m/s), ou bola solta!
      const canCatchCleanly =
        dx < 0.82 ||
        shotSpeed < 25.5 ||
        (dx < 1.12 && shotSpeed < 29.0 && Math.random() < 0.65);

      if (canCatchCleanly) {
        caughtFirmly = true;
        ball.ownerId = 'GK';
        ball.lastTouchBy = 'GK';
        gk.holdBallTimer = 0.95;
      } else {
        // Bomba no limite da ponta dos dedos: espalma FORTE pros lados (escanteio/lateral), nunca pro pé do atacante!
        const pushSide = ball.pos.x >= gk.pos.x ? 1 : -1;
        ball.lastTouchBy = 'GK';
        ball.touchCooldown = 0.28;
        ball.vel.set(
          pushSide * (11.5 + Math.random() * 4.5),
          2.8 + Math.random() * 2.2,
          Math.abs(ball.vel.z) * 0.25 + 3.5,
        );
        ball.spin.multiplyScalar(0.25);
      }
    }
  }

  gk.actor.root.position.copy(gk.pos);
  gk.actor.root.rotation.y = Math.atan2(ball.pos.x - gk.pos.x, ball.pos.z - gk.pos.z) * 0.45;

  const gkSpd = Math.hypot(gk.vel.x, gk.vel.z);
  const pose: PitchPoseState =
    gk.diveDir === -1
      ? 'GK_DIVE_LEFT'
      : gk.diveDir === 1
        ? 'GK_DIVE_RIGHT'
        : gkSpd > 2.2
          ? 'RUN'
          : 'GK_READY';
  animatePitchActor(gk.actor, pose, gkSpd, 0, false, dt, timeSec);

  return { madeSave, caughtFirmly };
}
