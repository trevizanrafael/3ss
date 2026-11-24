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
    heightCm: 190,
    weightKg: 84,
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
      acceleration: 78,
      sprintSpeed: 76,
      agility: 84,
      balance: 82,
      stamina: 80,
      strength: 84,
      finishing: 50,
      shotPower: 78,
      longShots: 50,
      positioning: 84,
      shortPass: 72,
      longPass: 78,
      dribbling: 55,
      ballControl: 70,
      tackling: 78,
      interceptions: 82,
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
  };
}

export function stepGoalkeeperAI(
  gk: GoalkeeperBrain,
  ball: BallState,
  userPos: THREE.Vector3,
  skillDifficulty01: number,
  dt: number,
  timeSec: number,
): { madeSave: boolean } {
  let madeSave = false;
  const baseGoalZ = -PITCH.HALF_L + 0.75;
  gk.smotherCooldown = Math.max(0, gk.smotherCooldown - dt);

  // 1. Se o goleiro agarrou a bola, dá 2 passos pra frente da pequena área e repõe pro jogo!
  if (ball.ownerId === 'GK') {
    gk.holdBallTimer -= dt;
    gk.pos.z = Math.min(-PITCH.HALF_L + 3.2, gk.pos.z + 1.8 * dt);
    ball.pos.set(gk.pos.x, 1.05, gk.pos.z + 0.42);
    ball.vel.set(0, 0, 0);
    if (gk.holdBallTimer <= 0) {
      ball.ownerId = null;
      ball.lastTouchBy = 'GK';
      ball.touchCooldown = 0.32;
      const aimZ = Math.max(-16, userPos.z);
      const toUser = new THREE.Vector3(userPos.x - gk.pos.x, 0, aimZ - gk.pos.z).normalize();
      ball.vel.set(toUser.x * 16.5, 4.2, toUser.z * 16.5);
      playBallKickSfx(0.6);
    }
    gk.actor.root.position.copy(gk.pos);
    gk.actor.root.rotation.y = 0;
    animatePitchActor(gk.actor, 'IDLE', 0, 0, false, dt, timeSec);
    return { madeSave: false };
  }

  if (gk.diveTimer > 0) {
    gk.diveTimer -= dt;
    gk.pos.x += gk.vel.x * dt;
    gk.pos.z += gk.vel.z * dt;
    gk.pos.x = Math.max(-PITCH.GOAL_HALF_W - 0.8, Math.min(PITCH.GOAL_HALF_W + 0.8, gk.pos.x));
    gk.pos.z = Math.max(-PITCH.HALF_L + 0.35, Math.min(-PITCH.HALF_L + 12.5, gk.pos.z));
  } else {
    gk.diveDir = 0;

    // 2. Posicionamento na bissetriz + SAÍDA AGRESSIVA NOS PÉS no 1x1 dentro da área!
    const distBallFromGoalCenter = Math.hypot(ball.pos.x, ball.pos.z - -PITCH.HALF_L);
    const attackerDribblingInBox =
      (ball.ownerId === 'USER' || ball.ownerId === 'MATE') &&
      ball.pos.z < -30.5 &&
      Math.abs(ball.pos.x) < 11.5;
    const looseBallInSixYard =
      ball.ownerId === null &&
      Math.hypot(ball.vel.x, ball.vel.z) < 7.5 &&
      ball.pos.z < -35.0 &&
      Math.abs(ball.pos.x) < 7.5;

    let targetX: number;
    let targetZ: number;
    let rushMode = false;

    if ((attackerDribblingInBox && distBallFromGoalCenter < 11.5) || looseBallInSixYard) {
      // Sai nos pés pra abafar! Você não consegue mais entrar andando no gol!
      rushMode = true;
      targetX = ball.pos.x * 0.88;
      targetZ = Math.min(-PITCH.HALF_L + 10.5, ball.pos.z - 0.35);
    } else {
      // Fecha o ângulo na bissetriz entre a bola e o centro do gol
      const stepOutDist =
        ball.pos.z < -22
          ? Math.min(3.8, Math.max(0.8, (1 - (distBallFromGoalCenter - 8) / 22) * 3.8))
          : 0.78;
      const dirFromGoalX = ball.pos.x / Math.max(1, distBallFromGoalCenter);
      const dirFromGoalZ = (ball.pos.z - -PITCH.HALF_L) / Math.max(1, distBallFromGoalCenter);
      targetX = Math.max(
        -PITCH.GOAL_HALF_W + 0.45,
        Math.min(PITCH.GOAL_HALF_W - 0.45, dirFromGoalX * (stepOutDist + 1.4)),
      );
      targetZ = Math.max(baseGoalZ, -PITCH.HALF_L + dirFromGoalZ * stepOutDist);
    }

    // 3. Leitura de Chute (incluindo compensação parcial da curva Magnus!)
    if (
      ball.ownerId === null &&
      ball.vel.z < -6.0 &&
      ball.pos.z < -6 &&
      ball.pos.z > -PITCH.HALF_L
    ) {
      const interceptZ = gk.pos.z;
      const tHit = (interceptZ - ball.pos.z) / ball.vel.z;
      if (tHit > 0 && tHit < 1.2) {
        const magnusAx = ball.spin.y * ball.vel.z * BALL_AERO.MAGNUS_COEFF;
        // Goleiro lê ~65% da curva no ar (chutes colocados fortes na gaveta ainda batem ele!)
        const predX = ball.pos.x + ball.vel.x * tHit + 0.5 * magnusAx * tHit * tHit * 0.65;
        if (Math.abs(predX) < PITCH.GOAL_HALF_W + 0.9) {
          targetX = Math.max(-PITCH.GOAL_HALF_W, Math.min(PITCH.GOAL_HALF_W, predX));
          const deltaX = predX - gk.pos.x;
          if (Math.abs(deltaX) > 0.95 && tHit < 0.54) {
            gk.diveDir = deltaX < 0 ? -1 : 1;
            gk.diveTimer = 0.48;
            gk.vel.set(gk.diveDir * (5.6 + skillDifficulty01 * 2.2), 0, 0);
          }
        }
      }
    }

    if (gk.diveTimer <= 0) {
      const maxSpd = rushMode ? 6.6 + skillDifficulty01 * 1.2 : 5.2 + skillDifficulty01 * 2.1;
      const dx = targetX - gk.pos.x;
      const dz = targetZ - gk.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.05) {
        const spd = Math.min(maxSpd, d * 8.0);
        gk.vel.set((dx / d) * spd, 0, (dz / d) * spd);
        gk.pos.addScaledVector(gk.vel, dt);
      } else {
        gk.vel.set(0, 0, 0);
      }
    }
  }

  // 4. ABAFA NOS PÉS 1x1 (desarma se você tentar entrar com bola e tudo ou demorar na cara dele!)
  const distToBallHoriz = Math.hypot(ball.pos.x - gk.pos.x, ball.pos.z - gk.pos.z);
  if (
    (ball.ownerId === 'USER' || ball.ownerId === 'MATE') &&
    gk.smotherCooldown <= 0 &&
    distToBallHoriz < 1.28 &&
    ball.pos.y < 1.4
  ) {
    madeSave = true;
    gk.smotherCooldown = 0.9;
    gk.diveDir = ball.pos.x < gk.pos.x ? -1 : 1;
    gk.diveTimer = 0.34;
    gk.vel.set(0, 0, 0);
    playBallKickSfx(0.7);

    // 60% encaixa firme nos pés, 40% espalma dividindo pro lado!
    if (Math.random() < 0.6) {
      ball.ownerId = 'GK';
      ball.lastTouchBy = 'GK';
      gk.holdBallTimer = 0.85;
    } else {
      const pushX = ball.pos.x >= gk.pos.x ? 1 : -1;
      ball.ownerId = null;
      ball.lastTouchBy = 'GK';
      ball.touchCooldown = 0.35;
      ball.vel.set(pushX * 8.5, 2.2, 6.5);
    }
  } else if (
    // 5. Defesa de Chutes / Bolas Soltas na Área
    ball.ownerId === null &&
    ball.touchCooldown <= 0.18 &&
    ball.pos.z > -PITCH.HALF_L - 0.15
  ) {
    const reachX = gk.diveTimer > 0 ? 1.34 : 0.85;
    const reachZ = gk.diveTimer > 0 ? 0.85 : 0.82;
    const reachY = gk.diveTimer > 0 ? 2.3 : 2.18;
    const dx = Math.abs(ball.pos.x - gk.pos.x);
    const dz = Math.abs(ball.pos.z - gk.pos.z);

    const movingTowardGoalOrLooseClose =
      ball.vel.z < -1.2 || (distToBallHoriz < 0.95 && ball.pos.z < -33);

    if (dx < reachX && dz < reachZ && ball.pos.y < reachY && movingTowardGoalOrLooseClose) {
      madeSave = true;
      const shotSpeed = ball.vel.length();
      playBallKickSfx(0.68);

      if (shotSpeed < 16.5 && gk.diveTimer <= 0) {
        ball.ownerId = 'GK';
        ball.lastTouchBy = 'GK';
        gk.holdBallTimer = 0.85;
      } else {
        const pushSide = ball.pos.x >= gk.pos.x ? 1 : -1;
        ball.lastTouchBy = 'GK';
        ball.touchCooldown = 0.25;
        ball.vel.set(
          pushSide * (6.5 + Math.random() * 4),
          3.0 + Math.random() * 2.4,
          Math.abs(ball.vel.z) * 0.4 + 4.5,
        );
        ball.spin.multiplyScalar(0.3);
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

  return { madeSave };
}
