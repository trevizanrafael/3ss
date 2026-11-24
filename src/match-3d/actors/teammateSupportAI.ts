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
} from './pitchActorRig';

export interface SupportTeammateBrain {
  actor: PitchActorInstance;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  facingYaw: number;
  holdTimer: number;
  pendingDelivery: 'PASS' | 'THROUGH' | 'CROSS';
}

export function createSupportTeammate(club: ClubData): SupportTeammateBrain {
  const mateProfile: CareerPlayer = {
    fullName: 'Camisa 8 Apoio',
    shirtName: 'APOIO',
    shirtNumber: 8,
    age: 24,
    birthDay: 8,
    birthMonth: 6,
    birthYear: 2002,
    nationality: club.country,
    startingLeagueCountry: 'BRA',
    position: 'MC',
    preferredFoot: 'DIREITA',
    heightCm: 179,
    weightKg: 74,
    appearance: {
      skinTone: '#F1C27D',
      hairStyle: 'TOPETE',
      hairColor: '#D97706',
      facialHair: 'LIMPO',
      eyeColor: '#3B2F2F',
      shirtTuck: 'SOLTA',
      sleeveStyle: 'CURTA',
      sockHeight: 'PADRAO',
      accessory: 'NENHUM',
      bootColor: '#EC4899',
    },
    attributes: {
      acceleration: 79, sprintSpeed: 78, agility: 81, balance: 80, stamina: 84, strength: 74,
      finishing: 72, shotPower: 76, longShots: 75, positioning: 82, shortPass: 84, longPass: 83,
      dribbling: 80, ballControl: 83, tackling: 68, interceptions: 70,
    },
    attributeXp: {
      acceleration: 0, sprintSpeed: 0, agility: 0, balance: 0, stamina: 0, strength: 0,
      finishing: 0, shotPower: 0, longShots: 0, positioning: 0, shortPass: 0, longPass: 0,
      dribbling: 0, ballControl: 0, tackling: 0, interceptions: 0,
    },
    overall: club.squadAvgOvr,
    reputationStars: 2,
    stamina: 100,
    careerTotals: { matches: 0, goals: 0, assists: 0, threeStarMatches: 0, trophies: 0 },
  };

  const actor = createPitchFootballerActor(mateProfile, club);
  const pos = new THREE.Vector3(10.5, 0, -15);
  actor.root.position.copy(pos);

  return {
    actor,
    pos,
    vel: new THREE.Vector3(),
    facingYaw: 0,
    holdTimer: 0,
    pendingDelivery: 'PASS',
  };
}

export function stepSupportTeammateAI(
  mate: SupportTeammateBrain,
  ball: BallState,
  userPos: THREE.Vector3,
  userVel: THREE.Vector3,
  calledForBall: 'PASS' | 'THROUGH' | 'CROSS' | null,
  dt: number,
  timeSec: number,
): { deliveredAssistPass: boolean } {
  let deliveredAssistPass = false;

  if (calledForBall) {
    mate.pendingDelivery = calledForBall;
  }

  // Domina passes enviados pelo jogador!
  const distToBall = Math.hypot(ball.pos.x - mate.pos.x, ball.pos.z - mate.pos.z);
  if (
    ball.ownerId === null &&
    ball.touchCooldown <= 0 &&
    distToBall < 1.05 &&
    ball.pos.y < 1.5
  ) {
    ball.ownerId = 'MATE';
    ball.lastTouchBy = 'MATE';
    mate.holdTimer = 0.45; // Segura meio segundo para abrir espaço na tabelinha!
    mate.pendingDelivery = 'THROUGH';
  }

  if (ball.ownerId === 'MATE') {
    mate.holdTimer -= dt;
    // Conduz levemente rumo ao ataque enquanto prepara a devolução
    mate.vel.set(0, 0, -3.5);
    mate.pos.addScaledVector(mate.vel, dt);
    mate.facingYaw = Math.atan2(userPos.x - mate.pos.x, userPos.z - mate.pos.z);

    ball.pos.set(
      mate.pos.x + Math.sin(mate.facingYaw) * 0.58,
      PITCH.BALL_RADIUS,
      mate.pos.z + Math.cos(mate.facingYaw) * 0.58,
    );

    if (mate.holdTimer <= 0 || calledForBall !== null) {
      ball.ownerId = null;
      ball.lastTouchBy = 'MATE';
      ball.touchCooldown = 0.24;

      const mode = calledForBall ?? mate.pendingDelivery;
      let targetX = userPos.x + userVel.x * 0.45;
      let targetZ = userPos.z + userVel.z * 0.45;

      if (mode === 'THROUGH') {
        targetZ = Math.max(-PITCH.HALF_L + 5.5, userPos.z - 6.2);
      } else if (mode === 'CROSS') {
        targetX = userPos.x * 0.65;
        targetZ = Math.max(-PITCH.HALF_L + 6.5, Math.min(-28, userPos.z - 4));
      }

      const dx = targetX - mate.pos.x;
      const dz = targetZ - mate.pos.z;
      const dist = Math.max(1, Math.hypot(dx, dz));
      const dirX = dx / dist;
      const dirZ = dz / dist;

      if (mode === 'CROSS') {
        const spd = Math.min(20, Math.max(13, dist * 0.95));
        ball.vel.set(dirX * spd, 7.8, dirZ * spd);
      } else {
        const spd = Math.min(22, Math.max(13.5, dist * 1.22));
        ball.vel.set(dirX * spd, 0.35, dirZ * spd);
      }

      playBallKickSfx(0.55);
      deliveredAssistPass = true;
    }
  } else {
    // Movimentação inteligente de apoio pela ala oposta para abrir linha de passe / tabelinha!
    let targetX = userPos.x >= 0 ? -10.5 : 10.5;
    let targetZ = Math.max(-PITCH.HALF_L + 8, Math.min(10, userPos.z - 4.5));

    // Se a bola estiver solta longe do jogador e perto do companheiro, ele vai buscar pra tocar pra você!
    if (ball.ownerId === null && distToBall < 9 && distToBall < Math.hypot(ball.pos.x - userPos.x, ball.pos.z - userPos.z) - 1.5) {
      targetX = ball.pos.x;
      targetZ = ball.pos.z;
    }

    const dx = targetX - mate.pos.x;
    const dz = targetZ - mate.pos.z;
    const d = Math.hypot(dx, dz);
    const spd = d > 0.6 ? Math.min(6.6, d * 2.4) : 0;
    if (d > 0.1) {
      mate.vel.set((dx / d) * spd, 0, (dz / d) * spd);
      mate.pos.addScaledVector(mate.vel, dt);
      if (spd > 0.5) {
        mate.facingYaw = Math.atan2(mate.vel.x, mate.vel.z);
      } else {
        mate.facingYaw = Math.atan2(ball.pos.x - mate.pos.x, ball.pos.z - mate.pos.z);
      }
    } else {
      mate.vel.set(0, 0, 0);
    }
  }

  mate.actor.root.position.copy(mate.pos);
  mate.actor.root.rotation.y = mate.facingYaw;
  animatePitchActor(
    mate.actor.rig,
    mate.vel.length() > 0.4 ? 'RUN' : 'IDLE',
    mate.vel.length(),
    0,
    false,
    timeSec,
  );

  return { deliveredAssistPass };
}
