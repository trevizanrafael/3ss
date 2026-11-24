import * as THREE from 'three';
import { ClubData } from '../../data/clubs/types';
import { CareerPlayer } from '../../domains/player/playerTypes';
import { playBallKickSfx } from '../audio/matchAudio';
import { BallState } from '../physics/ballPhysics';
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
  velX: number;
  diveTimer: number;
  diveDir: -1 | 0 | 1;
  holdBallTimer: number;
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
      acceleration: 75,
      sprintSpeed: 74,
      agility: 82,
      balance: 80,
      stamina: 80,
      strength: 82,
      finishing: 50,
      shotPower: 78,
      longShots: 50,
      positioning: 82,
      shortPass: 72,
      longPass: 78,
      dribbling: 55,
      ballControl: 70,
      tackling: 75,
      interceptions: 80,
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
    velX: 0,
    diveTimer: 0,
    diveDir: 0,
    holdBallTimer: 0,
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
  const goalZ = -PITCH.HALF_L + 0.78;

  // Se o goleiro agarrou a bola, segura 0.85s e repõe pro meio pra você continuar jogando!
  if (ball.ownerId === 'GK') {
    gk.holdBallTimer -= dt;
    ball.pos.set(gk.pos.x, 1.05, gk.pos.z + 0.42);
    ball.vel.set(0, 0, 0);
    if (gk.holdBallTimer <= 0) {
      ball.ownerId = null;
      ball.lastTouchBy = 'GK';
      ball.touchCooldown = 0.3;
      const toUser = new THREE.Vector3(userPos.x - gk.pos.x, 0, Math.max(-18, userPos.z) - gk.pos.z).normalize();
      ball.vel.set(toUser.x * 16, 4.5, toUser.z * 16);
      playBallKickSfx(0.6);
    }
    gk.actor.root.position.copy(gk.pos);
    gk.actor.root.rotation.y = 0;
    animatePitchActor(gk.actor.rig, 'IDLE', 0, 0, false, timeSec);
    return { madeSave: false };
  }

  if (gk.diveTimer > 0) {
    gk.diveTimer -= dt;
    gk.pos.x += gk.velX * dt;
    gk.pos.x = Math.max(-PITCH.GOAL_HALF_W - 0.3, Math.min(PITCH.GOAL_HALF_W + 0.3, gk.pos.x));
  } else {
    gk.diveDir = 0;
    // Fecha o ângulo acompanhando o X da bola na linha da pequena área!
    let targetX = Math.max(-PITCH.GOAL_HALF_W + 0.55, Math.min(PITCH.GOAL_HALF_W - 0.55, ball.pos.x * 0.42));
    const targetZ = ball.pos.z < -26 ? goalZ + 0.65 : goalZ;

    // Se um chute rápido vem na direção do gol Norte, calcula o ponto de interceptação e salta!
    if (ball.ownerId === null && ball.vel.z < -6.5 && ball.pos.z < -8 && ball.pos.z > -PITCH.HALF_L) {
      const tHit = (goalZ - ball.pos.z) / ball.vel.z;
      if (tHit > 0 && tHit < 1.15) {
        const predX = ball.pos.x + ball.vel.x * tHit;
        if (Math.abs(predX) < PITCH.GOAL_HALF_W + 0.8) {
          targetX = Math.max(-PITCH.GOAL_HALF_W, Math.min(PITCH.GOAL_HALF_W, predX));
          const deltaX = predX - gk.pos.x;
          if (Math.abs(deltaX) > 1.05 && tHit < 0.52) {
            gk.diveDir = deltaX < 0 ? -1 : 1;
            gk.diveTimer = 0.48;
            gk.velX = gk.diveDir * (5.6 + skillDifficulty01 * 2.1);
          }
        }
      }
    }

    const maxGkMove = 5.0 + skillDifficulty01 * 2.2;
    const dx = targetX - gk.pos.x;
    gk.velX = Math.max(-maxGkMove, Math.min(maxGkMove, dx * 7.5));
    gk.pos.x += gk.velX * dt;
    gk.pos.z += (targetZ - gk.pos.z) * Math.min(1, 5 * dt);
  }

  // Colisão / Defesa do Goleiro (alcance maior durante ponte aérea!)
  if (ball.ownerId === null && ball.touchCooldown <= 0.16 && ball.pos.z > -PITCH.HALF_L - 0.1) {
    const reachX = gk.diveTimer > 0 ? 1.32 : 0.78;
    const reachY = gk.diveTimer > 0 ? 2.28 : 2.15;
    const dx = Math.abs(ball.pos.x - gk.pos.x);
    const dz = Math.abs(ball.pos.z - gk.pos.z);

    if (dx < reachX && dz < 0.72 && ball.pos.y < reachY && ball.vel.z < -1.5) {
      madeSave = true;
      const shotSpeed = ball.vel.length();
      playBallKickSfx(0.65);

      if (shotSpeed < 17 && gk.diveTimer <= 0) {
        // Encaixa firme!
        ball.ownerId = 'GK';
        ball.lastTouchBy = 'GK';
        gk.holdBallTimer = 0.85;
      } else {
        // Espalma para o lado / escanteio / rebote!
        const pushSide = ball.pos.x >= gk.pos.x ? 1 : -1;
        ball.lastTouchBy = 'GK';
        ball.touchCooldown = 0.22;
        ball.vel.set(pushSide * (6.5 + Math.random() * 4), 3.2 + Math.random() * 2.5, Math.abs(ball.vel.z) * 0.42 + 4);
        ball.spin.multiplyScalar(0.3);
      }
    }
  }

  gk.actor.root.position.copy(gk.pos);
  gk.actor.root.rotation.y = Math.atan2(ball.pos.x - gk.pos.x, ball.pos.z - gk.pos.z) * 0.35;

  const pose: PitchPoseState =
    gk.diveDir === -1
      ? 'GK_DIVE_LEFT'
      : gk.diveDir === 1
        ? 'GK_DIVE_RIGHT'
        : 'GK_READY';
  animatePitchActor(gk.actor.rig, pose, Math.abs(gk.velX), 0, false, timeSec);

  return { madeSave };
}
