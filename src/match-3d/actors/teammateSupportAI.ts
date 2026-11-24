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
  /** Alvo inteligente da bola enfiada (Y) para o parceiro disparar imediatamente nas costas! */
  throughRunTarget: THREE.Vector3 | null;
  throughRunTimer: number;
}

function shortestAngleDiff(from: number, to: number): number {
  let diff = ((to - from + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

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

  for (let i = 1; i <= 28; i++) {
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
    bestX = px;
    bestZ = pz;
    if (t - mateTimeNeeded >= -0.04) {
      return new THREE.Vector3(bestX, 0, bestZ);
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
      acceleration: 85, sprintSpeed: 85, agility: 84, balance: 82, stamina: 86, strength: 76,
      finishing: 84, shotPower: 84, longShots: 80, positioning: 88, shortPass: 86, longPass: 84,
      dribbling: 82, ballControl: 86, tackling: 68, interceptions: 74,
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
    throughRunTarget: null,
    throughRunTimer: 0,
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
  if (mate.throughRunTimer > 0) {
    mate.throughRunTimer = Math.max(0, mate.throughRunTimer - dt);
    if (mate.throughRunTimer <= 0) mate.throughRunTarget = null;
  }

  const distToBall = Math.hypot(ball.pos.x - mate.pos.x, ball.pos.z - mate.pos.z);
  const userDistToBall = Math.hypot(ball.pos.x - userPos.x, ball.pos.z - userPos.z);

  const shootAtOpenGoalCorner = () => {
    ball.ownerId = null;
    ball.lastTouchBy = 'MATE';
    ball.touchCooldown = 0.25;

    const openSide = gkPos.x >= 0 ? -1 : 1;
    const aimX = openSide * (2.25 + Math.random() * 0.65);
    const dx = aimX - mate.pos.x;
    const dz = -PITCH.HALF_L - mate.pos.z;
    const dist = Math.max(3.5, Math.hypot(dx, dz));
    const spd = Math.min(31, 24 + dist * 0.24);
    const tGoal = dist / spd;
    // Altura firme de chute na rede (sobe bonito sem pingar!)
    const targetGoalY = dist > 14 ? 1.75 : 1.35;
    const vy0 = (targetGoalY - PITCH.BALL_RADIUS - 0.5 * BALL_AERO.GRAVITY * tGoal * tGoal) / tGoal;

    ball.vel.set((dx / dist) * spd, Math.max(2.2, vy0), (dz / dist) * spd);
    ball.spin.set(-2.5, openSide * -4, 0);
    mate.facingYaw = Math.atan2(dx, dz);
    mate.kickAnimTimer = 0.28;
    playBallKickSfx(0.84);

    if (mate.receivedFromUser) {
      shotByMateFromUserPass = true;
    }
  };

  // 1. Domínio ou finalização de primeira!
  if (
    ball.ownerId === null &&
    ball.touchCooldown <= 0 &&
    distToBall < 1.25 &&
    ball.pos.y < 2.2
  ) {
    const cameFromUser = ball.lastTouchBy === 'USER';
    mate.receivedFromUser = cameFromUser;
    mate.throughRunTarget = null;
    mate.throughRunTimer = 0;

    const inPrimeBox = mate.pos.z < -29.5 && Math.abs(mate.pos.x) < 11.5;
    if (
      cameFromUser &&
      inPrimeBox &&
      calledForBall === null &&
      (ball.pos.y > 0.65 || Math.abs(gkPos.x - mate.pos.x) > 1.35)
    ) {
      shootAtOpenGoalCorner();
      mate.actor.root.position.copy(mate.pos);
      mate.actor.root.rotation.y = mate.facingYaw;
      animatePitchActor(mate.actor, 'KICK', 0, 0, false, dt, timeSec);
      return { deliveredAssistPass: false, shotByMateFromUserPass };
    }

    ball.ownerId = 'MATE';
    ball.lastTouchBy = 'MATE';
    ball.spin.set(0, 0, 0);
    mate.holdTimer = 1.4;
  }

  // 2. Com a bola no pé
  if (ball.ownerId === 'MATE') {
    mate.holdTimer -= dt;

    const goalLaneX =
      mate.pos.x > 3 ? mate.pos.x - 2.5 : mate.pos.x < -3 ? mate.pos.x + 2.5 : mate.pos.x;
    const dribDir = new THREE.Vector3(
      goalLaneX - mate.pos.x,
      0,
      -PITCH.HALF_L + 7 - mate.pos.z,
    ).normalize();
    const dribSpd = 6.3;
    mate.vel.x += (dribDir.x * dribSpd - mate.vel.x) * Math.min(1, 10 * dt);
    mate.vel.z += (dribDir.z * dribSpd - mate.vel.z) * Math.min(1, 10 * dt);
    mate.pos.addScaledVector(mate.vel, dt);
    mate.pos.x = Math.max(-PITCH.HALF_W + 1.2, Math.min(PITCH.HALF_W - 1.2, mate.pos.x));
    mate.pos.z = Math.max(-PITCH.HALF_L + 2.5, Math.min(PITCH.HALF_L - 1.5, mate.pos.z));

    mate.facingYaw +=
      shortestAngleDiff(mate.facingYaw, Math.atan2(mate.vel.x, mate.vel.z)) *
      Math.min(1, 12 * dt);

    ball.pos.set(
      mate.pos.x + Math.sin(mate.facingYaw) * 0.58,
      PITCH.BALL_RADIUS,
      mate.pos.z + Math.cos(mate.facingYaw) * 0.58,
    );
    ball.vel.copy(mate.vel);

    const distToGoal = Math.hypot(mate.pos.x, -PITCH.HALF_L - mate.pos.z);
    const distToGk = Math.hypot(mate.pos.x - gkPos.x, mate.pos.z - gkPos.z);
    const hasGreatShotAngle =
      mate.pos.z < -25.0 && Math.abs(mate.pos.x) < 13.5 && distToGoal < 19.5;
    const gkClosingIn = distToGk < 4.8 && mate.pos.z < -30;

    if (
      commandedMateShoot ||
      (calledForBall === null && (gkClosingIn || (hasGreatShotAngle && mate.holdTimer < 1.05)))
    ) {
      shootAtOpenGoalCorner();
    } else if (calledForBall !== null || mate.holdTimer <= 0) {
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
        const leadZ = userSpeed > 1.5 ? Math.min(-4.2, userVel.z * 0.9) : -5.2;
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
        const horizSpd = Math.min(22, Math.max(12.5, dist * 0.98));
        const tFlight = dist / horizSpd;
        const loftY = Math.min(
          11.2,
          Math.max(5.5, 0.5 * Math.abs(BALL_AERO.GRAVITY) * tFlight * 0.9),
        );
        ball.vel.set(dirX * horizSpd, loftY, dirZ * horizSpd);
        ball.spin.set(-3.5, 0, 0);
      } else {
        const spd = Math.min(
          24.5,
          Math.max(12.0, Math.sqrt(2 * BALL_AERO.GRASS_FRICTION * dist + 74)),
        );
        ball.vel.set(dirX * spd, 0.25, dirZ * spd);
        ball.spin.set(0, 0, 0);
      }

      mate.facingYaw = Math.atan2(dirX, dirZ);
      mate.kickAnimTimer = 0.26;
      playBallKickSfx(0.55);
      deliveredAssistPass = true;
    }
  } else {
    // 3. SEM A BOLA: Dispara no alvo teleguiado se você apertou Y (Enfiada), ou intercepta passes!
    const mateMaxSprint = 9.1;
    let chasingLooseBall = false;
    let targetX = mate.pos.x;
    let targetZ = mate.pos.z;

    if (ball.ownerId === null && mate.throughRunTarget && mate.throughRunTimer > 0) {
      chasingLooseBall = true;
      const intercept = predictPassInterceptPoint(ball, mate.pos, mateMaxSprint);
      targetX = intercept.x;
      targetZ = intercept.z;
    } else if (ball.ownerId === null) {
      const intercept = predictPassInterceptPoint(ball, mate.pos, mateMaxSprint);
      const mateDistToIntercept = Math.hypot(intercept.x - mate.pos.x, intercept.z - mate.pos.z);
      const userDistToIntercept = Math.hypot(intercept.x - userPos.x, intercept.z - userPos.z);

      const passIntendedForMate =
        ball.lastTouchBy === 'USER' &&
        (userDistToBall > 1.8 || mateDistToIntercept < userDistToIntercept + 5.0) &&
        mateDistToIntercept < 30;

      const looseNearMate =
        distToBall < 14 && mateDistToIntercept <= userDistToIntercept + 1.5;

      if (passIntendedForMate || looseNearMate) {
        chasingLooseBall = true;
        targetX = intercept.x;
        targetZ = intercept.z;
      }
    }

    if (!chasingLooseBall) {
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
      ? d > 0.12
        ? mateMaxSprint
        : 0
      : d > 0.5
        ? Math.min(7.5, d * 2.6)
        : 0;

    const wishVx = d > 0.08 ? (dx / d) * desiredSpd : 0;
    const wishVz = d > 0.08 ? (dz / d) * desiredSpd : 0;
    mate.vel.x += (wishVx - mate.vel.x) * Math.min(1, 13 * dt);
    mate.vel.z += (wishVz - mate.vel.z) * Math.min(1, 13 * dt);
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
