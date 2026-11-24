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

export interface SupportTeammateBrain {
  actor: PitchActorInstance;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  facingYaw: number;
  holdTimer: number;
  kickAnimTimer: number;
  receivedFromUser: boolean;
}

function shortestAngleDiff(from: number, to: number): number {
  let diff = ((to - from + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

/**
 * Calcula o ponto futuro exato da bola onde o companheiro consegue interceptar mais rápido
 * (seja passe no pé, bola enfiada na frente, passe curto atrás ou bola espirrada!).
 */
function predictPassInterceptPoint(
  ball: BallState,
  matePos: THREE.Vector3,
  mateMaxSpeed: number,
): THREE.Vector3 {
  let px = ball.pos.x;
  let pz = ball.pos.z;
  let vx = ball.vel.x;
  let vz = ball.vel.z;
  const stepDt = 0.08;

  let bestX = px;
  let bestZ = pz;
  let bestMargin = -999;

  for (let i = 1; i <= 26; i++) {
    const t = i * stepDt;
    const speed = Math.hypot(vx, vz);
    if (speed > 0.05 && ball.pos.y <= 0.45) {
      const drop = Math.max(0, speed - BALL_AERO.GRASS_FRICTION * stepDt);
      const r = drop / speed;
      vx *= r;
      vz *= r;
    } else {
      vx *= 1 - BALL_AERO.AIR_DRAG * stepDt;
      vz *= 1 - BALL_AERO.AIR_DRAG * stepDt;
    }
    px = Math.max(-PITCH.HALF_W + 0.6, Math.min(PITCH.HALF_W - 0.6, px + vx * stepDt));
    pz = Math.max(-PITCH.HALF_L + 0.8, Math.min(PITCH.HALF_L - 0.8, pz + vz * stepDt));

    const mateTimeNeeded = Math.hypot(px - matePos.x, pz - matePos.z) / mateMaxSpeed;
    const margin = t - mateTimeNeeded;
    bestX = px;
    bestZ = pz;
    if (margin >= -0.05) {
      return new THREE.Vector3(bestX, 0, bestZ);
    }
    if (margin > bestMargin) {
      bestMargin = margin;
    }
  }

  return new THREE.Vector3(bestX, 0, bestZ);
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
      acceleration: 84, sprintSpeed: 84, agility: 83, balance: 82, stamina: 86, strength: 76,
      finishing: 82, shotPower: 83, longShots: 80, positioning: 86, shortPass: 86, longPass: 84,
      dribbling: 82, ballControl: 85, tackling: 68, interceptions: 74,
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
    kickAnimTimer: 0,
    receivedFromUser: false,
  };
}

export function stepSupportTeammateAI(
  mate: SupportTeammateBrain,
  ball: BallState,
  userPos: THREE.Vector3,
  userVel: THREE.Vector3,
  gkPos: THREE.Vector3,
  calledForBall: 'PASS' | 'THROUGH' | 'CROSS' | null,
  commandedMateShoot: boolean,
  dt: number,
  timeSec: number,
): { deliveredAssistPass: boolean; shotByMateFromUserPass: boolean } {
  let deliveredAssistPass = false;
  let shotByMateFromUserPass = false;
  mate.kickAnimTimer = Math.max(0, mate.kickAnimTimer - dt);

  const distToBall = Math.hypot(ball.pos.x - mate.pos.x, ball.pos.z - mate.pos.z);
  const userDistToBall = Math.hypot(ball.pos.x - userPos.x, ball.pos.z - userPos.z);

  const shootAtOpenGoalCorner = () => {
    ball.ownerId = null;
    ball.lastTouchBy = 'MATE';
    ball.touchCooldown = 0.25;

    // Bate cruzado tirando do goleiro!
    const openSide = gkPos.x >= 0 ? -1 : 1;
    const aimX = openSide * (2.15 + Math.random() * 0.75);
    const dx = aimX - mate.pos.x;
    const dz = -PITCH.HALF_L - mate.pos.z;
    const dist = Math.max(3, Math.hypot(dx, dz));
    const spd = Math.min(30, 22.5 + dist * 0.22);
    const loftY = dist > 15 ? 4.4 : 2.6;

    ball.vel.set((dx / dist) * spd, loftY, (dz / dist) * spd);
    ball.spin.set(-3.5, openSide * -5, 0);
    mate.facingYaw = Math.atan2(dx, dz);
    mate.kickAnimTimer = 0.28;
    playBallKickSfx(0.82);

    if (mate.receivedFromUser) {
      shotByMateFromUserPass = true;
    }
  };

  // 1. Domínio ou finalização de primeira em cruzamento/passe na área!
  if (
    ball.ownerId === null &&
    ball.touchCooldown <= 0 &&
    distToBall < 1.22 &&
    ball.pos.y < 2.15
  ) {
    const cameFromUser = ball.lastTouchBy === 'USER';
    mate.receivedFromUser = cameFromUser;

    // Se vier um cruzamento/passe limpo dentro da área (z < -29) e você não pediu de volta, bate de primeira pro gol!
    const inPrimeBox = mate.pos.z < -29.5 && Math.abs(mate.pos.x) < 11.5;
    if (cameFromUser && inPrimeBox && calledForBall === null && (ball.pos.y > 0.65 || Math.abs(gkPos.x - mate.pos.x) > 1.3)) {
      shootAtOpenGoalCorner();
      mate.actor.root.position.copy(mate.pos);
      mate.actor.root.rotation.y = mate.facingYaw;
      animatePitchActor(mate.actor, 'KICK', 0, 0, false, dt, timeSec);
      return { deliveredAssistPass: false, shotByMateFromUserPass };
    }

    ball.ownerId = 'MATE';
    ball.lastTouchBy = 'MATE';
    ball.spin.set(0, 0, 0);
    // Segura e conduz com calma (até 1.45s) em vez de rifar bola aleatória!
    mate.holdTimer = 1.45;
  }

  // 2. Comportamento COM A BOLA NO PÉ (inteligente: conduz pro gol, chuta se tiver livre, ou devolve redondinho!)
  if (ball.ownerId === 'MATE') {
    mate.holdTimer -= dt;

    // Conduz em direção ao gol desviando da linha do goleiro
    const goalLaneX = mate.pos.x > 3 ? mate.pos.x - 2.5 : mate.pos.x < -3 ? mate.pos.x + 2.5 : mate.pos.x;
    const dribDir = new THREE.Vector3(goalLaneX - mate.pos.x, 0, -PITCH.HALF_L + 7 - mate.pos.z).normalize();
    const dribSpd = 6.2;
    mate.vel.x += (dribDir.x * dribSpd - mate.vel.x) * Math.min(1, 10 * dt);
    mate.vel.z += (dribDir.z * dribSpd - mate.vel.z) * Math.min(1, 10 * dt);
    mate.pos.addScaledVector(mate.vel, dt);
    mate.pos.x = Math.max(-PITCH.HALF_W + 1.2, Math.min(PITCH.HALF_W - 1.2, mate.pos.x));
    mate.pos.z = Math.max(-PITCH.HALF_L + 2.5, Math.min(PITCH.HALF_L - 1.5, mate.pos.z));

    mate.facingYaw += shortestAngleDiff(mate.facingYaw, Math.atan2(mate.vel.x, mate.vel.z)) * Math.min(1, 12 * dt);

    ball.pos.set(
      mate.pos.x + Math.sin(mate.facingYaw) * 0.58,
      PITCH.BALL_RADIUS,
      mate.pos.z + Math.cos(mate.facingYaw) * 0.58,
    );
    ball.vel.copy(mate.vel);

    const distToGoal = Math.hypot(mate.pos.x, -PITCH.HALF_L - mate.pos.z);
    const distToGk = Math.hypot(mate.pos.x - gkPos.x, mate.pos.z - gkPos.z);
    const hasGreatShotAngle = mate.pos.z < -25.0 && Math.abs(mate.pos.x) < 13.5 && distToGoal < 19.5;
    const gkClosingIn = distToGk < 4.8 && mate.pos.z < -30;

    // Se você mandou chutar (B), ou se ele entrou livre na cara do gol e você não pediu passe, FINALIZA!
    if (
      commandedMateShoot ||
      (calledForBall === null && (gkClosingIn || (hasGreatShotAngle && mate.holdTimer < 1.05)))
    ) {
      shootAtOpenGoalCorner();
    } else if (calledForBall !== null || mate.holdTimer <= 0) {
      // Devolve o passe! Se você estiver PARADO, toca NO SEU PÉ (nunca joga bola perdida lá na frente!)
      ball.ownerId = null;
      ball.lastTouchBy = 'MATE';
      ball.touchCooldown = 0.24;

      const userSpeed = Math.hypot(userVel.x, userVel.z);
      const userRunningForward = userVel.z < -2.6 && userSpeed > 3.2;

      const deliveryMode: 'PASS' | 'THROUGH' | 'CROSS' =
        calledForBall ?? (userRunningForward ? 'THROUGH' : 'PASS');

      let targetX = userPos.x + userVel.x * 0.25;
      let targetZ = userPos.z + userVel.z * 0.25;

      if (deliveryMode === 'THROUGH') {
        const leadX = userSpeed > 1.5 ? userVel.x * 0.75 : 0;
        const leadZ = userSpeed > 1.5 ? Math.min(-3.8, userVel.z * 0.85) : -4.8;
        targetX = Math.max(-PITCH.HALF_W + 2, Math.min(PITCH.HALF_W - 2, userPos.x + leadX));
        targetZ = Math.max(-PITCH.HALF_L + 5.0, userPos.z + leadZ);
      } else if (deliveryMode === 'CROSS') {
        targetX = userPos.x + userVel.x * 0.5;
        targetZ = Math.max(-PITCH.HALF_L + 5.5, Math.min(userPos.z - 2.0, -29));
      }

      const dx = targetX - mate.pos.x;
      const dz = targetZ - mate.pos.z;
      const dist = Math.max(1, Math.hypot(dx, dz));
      const dirX = dx / dist;
      const dirZ = dz / dist;

      if (deliveryMode === 'CROSS') {
        const horizSpd = Math.min(22, Math.max(12.5, dist * 0.96));
        const tFlight = dist / horizSpd;
        const loftY = Math.min(10.2, Math.max(5.2, 0.5 * Math.abs(BALL_AERO.GRAVITY) * tFlight * 0.9));
        ball.vel.set(dirX * horizSpd, loftY, dirZ * horizSpd);
        ball.spin.set(-3.5, 0, 0);
      } else {
        // Velocidade calibrada com o atrito da grama para chegar firme no seu pé sem passar direto!
        const spd = Math.min(24, Math.max(11.5, Math.sqrt(2 * BALL_AERO.GRASS_FRICTION * dist + 72)));
        ball.vel.set(dirX * spd, 0.25, dirZ * spd);
        ball.spin.set(0, 0, 0);
      }

      mate.facingYaw = Math.atan2(dirX, dirZ);
      mate.kickAnimTimer = 0.26;
      playBallKickSfx(0.55);
      deliveredAssistPass = true;
    }
  } else {
    // 3. SEM A BOLA: Corre igual jogador de verdade p/ buscar qualquer passe/enfiada/bola próxima!
    const mateMaxSprint = 8.9;
    let chasingLooseBall = false;
    let targetX = mate.pos.x;
    let targetZ = mate.pos.z;

    if (ball.ownerId === null) {
      const intercept = predictPassInterceptPoint(ball, mate.pos, mateMaxSprint);
      const mateDistToIntercept = Math.hypot(intercept.x - mate.pos.x, intercept.z - mate.pos.z);
      const userDistToIntercept = Math.hypot(intercept.x - userPos.x, intercept.z - userPos.z);

      // Se você tocou a bola (lastTouchBy === 'USER' e não está colada em você) OU ele chega antes/perto, VAI BUSCAR!
      const passIntendedForMate =
        ball.lastTouchBy === 'USER' &&
        (userDistToBall > 1.8 || mateDistToIntercept < userDistToIntercept + 4.5) &&
        mateDistToIntercept < 28;

      const looseNearMate =
        distToBall < 14 && mateDistToIntercept <= userDistToIntercept + 1.5;

      if (passIntendedForMate || looseNearMate) {
        chasingLooseBall = true;
        targetX = intercept.x;
        targetZ = intercept.z;
      }
    }

    if (!chasingLooseBall) {
      // Posicionamento tático inteligente:
      // - Se você abriu na ponta (|x| > 9.5 e z < -18), ele infiltra na área (x oposto curto, z = -33) pronto pro cruzamento ou passe da morte!
      // - Senão, abre linha limpa de passe ao seu lado/diagonal sem se esconder atrás do goleiro!
      if (Math.abs(userPos.x) > 9.5 && userPos.z < -18) {
        targetX = userPos.x > 0 ? -2.8 : 2.8;
        targetZ = Math.max(-PITCH.HALF_L + 6.5, Math.min(-31, userPos.z - 3.5));
      } else {
        targetX = userPos.x >= 0 ? -9.5 : 9.5;
        targetZ = Math.max(-PITCH.HALF_L + 7.5, Math.min(12, userPos.z - 4.0));
      }
    }

    const dx = targetX - mate.pos.x;
    const dz = targetZ - mate.pos.z;
    const d = Math.hypot(dx, dz);
    const desiredSpd = chasingLooseBall
      ? d > 0.15
        ? mateMaxSprint
        : 0
      : d > 0.5
        ? Math.min(7.4, d * 2.6)
        : 0;

    const wishVx = d > 0.08 ? (dx / d) * desiredSpd : 0;
    const wishVz = d > 0.08 ? (dz / d) * desiredSpd : 0;
    mate.vel.x += (wishVx - mate.vel.x) * Math.min(1, 12 * dt);
    mate.vel.z += (wishVz - mate.vel.z) * Math.min(1, 12 * dt);
    mate.pos.addScaledVector(mate.vel, dt);

    const moveSpd = Math.hypot(mate.vel.x, mate.vel.z);
    if (moveSpd > 0.45) {
      mate.facingYaw +=
        shortestAngleDiff(mate.facingYaw, Math.atan2(mate.vel.x, mate.vel.z)) *
        Math.min(1, 12 * dt);
    } else {
      mate.facingYaw +=
        shortestAngleDiff(
          mate.facingYaw,
          Math.atan2(ball.pos.x - mate.pos.x, ball.pos.z - mate.pos.z),
        ) * Math.min(1, 8 * dt);
    }
  }

  mate.actor.root.position.copy(mate.pos);
  mate.actor.root.rotation.y = mate.facingYaw;

  const spd = Math.hypot(mate.vel.x, mate.vel.z);
  const pose: PitchPoseState =
    mate.kickAnimTimer > 0 ? 'KICK' : spd > 0.25 ? 'RUN' : 'IDLE';
  animatePitchActor(mate.actor, pose, spd, 0, false, dt, timeSec);

  return { deliveredAssistPass, shotByMateFromUserPass };
}
