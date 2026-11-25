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
  /** Cooldown pós-finalização p/ NUNCA ficar colado no goleiro chutando rebote infinito! */
  shotCooldown: number;
  receivedFromUser: boolean;
  /** Memória de pedido de passe quando você aperta A / Y / X sem a bola! */
  queuedCall: 'PASS' | 'THROUGH' | 'CROSS' | null;
  queuedCallTimer: number;
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
    shotCooldown: 0,
    receivedFromUser: false,
    queuedCall: null,
    queuedCallTimer: 0,
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
  mate.shotCooldown = Math.max(0, mate.shotCooldown - dt);

  if (calledForBall !== null) {
    mate.queuedCall = calledForBall;
    mate.queuedCallTimer = 2.4;
  } else if (mate.queuedCallTimer > 0) {
    mate.queuedCallTimer = Math.max(0, mate.queuedCallTimer - dt);
    if (mate.queuedCallTimer <= 0) mate.queuedCall = null;
  }

  if (mate.throughRunTimer > 0) {
    mate.throughRunTimer = Math.max(0, mate.throughRunTimer - dt);
    if (mate.throughRunTimer <= 0) mate.throughRunTarget = null;
  }

  // Se o jogador pegou a bola, limpa pedido antigo
  if (ball.ownerId === 'USER') {
    mate.queuedCall = null;
    mate.queuedCallTimer = 0;
  }

  const distToBall = Math.hypot(ball.pos.x - mate.pos.x, ball.pos.z - mate.pos.z);
  const userDistToBall = Math.hypot(ball.pos.x - userPos.x, ball.pos.z - userPos.z);

  const shootAtOpenGoalCorner = () => {
    ball.ownerId = null;
    ball.lastTouchBy = 'MATE';
    ball.touchCooldown = 0.45;
    mate.shotCooldown = 2.2;
    mate.queuedCall = null;
    mate.queuedCallTimer = 0;

    // Mira no melhor canto aberto do gol de 9.0m longe do goleiro!
    const openLeft = gkPos.x - -PITCH.GOAL_HALF_W;
    const openRight = PITCH.GOAL_HALF_W - gkPos.x;
    const openSide = openRight >= openLeft ? 1 : -1;
    const aimX = openSide * (2.85 + Math.random() * 0.75);
    const dx = aimX - mate.pos.x;
    const dz = -PITCH.HALF_L - mate.pos.z;
    const dist = Math.max(3.5, Math.hypot(dx, dz));
    const spd = Math.min(32, 24.5 + dist * 0.25);
    const tGoal = dist / spd;
    const targetGoalY = dist > 14 ? 1.9 : 1.5;
    const vy0 = (targetGoalY - PITCH.BALL_RADIUS - 0.5 * BALL_AERO.GRAVITY * tGoal * tGoal) / tGoal;

    ball.vel.set((dx / dist) * spd, Math.min(8.2, Math.max(2.0, vy0)), (dz / dist) * spd);
    ball.spin.set(-2.2, openSide * -3.5, 0);
    mate.facingYaw = Math.atan2(dx, dz);
    mate.kickAnimTimer = 0.28;
    playBallKickSfx(0.84);

    if (mate.receivedFromUser) {
      shotByMateFromUserPass = true;
    }
  };

  const deliverPassToUser = (mode: 'PASS' | 'THROUGH' | 'CROSS') => {
    ball.ownerId = null;
    ball.lastTouchBy = 'MATE';
    ball.touchCooldown = 0.32;
    mate.queuedCall = null;
    mate.queuedCallTimer = 0;

    const userSpeed = Math.hypot(userVel.x, userVel.z);
    let targetX = userPos.x + userVel.x * 0.25;
    let targetZ = userPos.z + userVel.z * 0.25;

    if (mode === 'THROUGH') {
      const leadX = userSpeed > 1.5 ? userVel.x * 0.75 : 0;
      const leadZ = userSpeed > 1.5 ? Math.min(-4.4, userVel.z * 0.9) : -5.5;
      targetX = Math.max(-PITCH.HALF_W + 2, Math.min(PITCH.HALF_W - 2, userPos.x + leadX));
      targetZ = Math.max(-PITCH.HALF_L + 5.2, userPos.z + leadZ);
    } else if (mode === 'CROSS') {
      targetX = userPos.x + userVel.x * 0.5;
      targetZ = Math.max(-PITCH.HALF_L + 5.8, Math.min(userPos.z - 2.0, -29));
    }

    const dx = targetX - mate.pos.x;
    const dz = targetZ - mate.pos.z;
    const dist = Math.max(1, Math.hypot(dx, dz));
    const dirX = dx / dist;
    const dirZ = dz / dist;

    if (mode === 'CROSS') {
      const horizSpd = Math.min(22, Math.max(12.5, dist * 0.98));
      const tFlight = dist / horizSpd;
      const loftY = Math.min(11.2, Math.max(5.5, 0.5 * Math.abs(BALL_AERO.GRAVITY) * tFlight * 0.9));
      ball.vel.set(dirX * horizSpd, loftY, dirZ * horizSpd);
      ball.spin.set(-3.5, 0, 0);
    } else {
      const spd = Math.min(
        25.0,
        Math.max(12.0, Math.sqrt(2 * BALL_AERO.GRASS_FRICTION * dist + 78)),
      );
      ball.vel.set(dirX * spd, 0.22, dirZ * spd);
      ball.spin.set(0, 0, 0);
    }

    mate.facingYaw = Math.atan2(dirX, dirZ);
    mate.kickAnimTimer = 0.26;
    playBallKickSfx(0.55);
    deliveredAssistPass = true;
  };

  // 1. Domínio ou finalização de primeira!
  if (
    ball.ownerId === null &&
    ball.touchCooldown <= 0 &&
    mate.shotCooldown <= 1.6 &&
    distToBall < 1.25 &&
    ball.pos.y < 2.2
  ) {
    const cameFromUser = ball.lastTouchBy === 'USER';
    mate.receivedFromUser = cameFromUser;
    mate.throughRunTarget = null;
    mate.throughRunTimer = 0;

    // Se você já apertou A / Y / X pedindo a bola, toca de primeira pra você na hora!
    if (mate.queuedCall !== null) {
      deliverPassToUser(mate.queuedCall);
      mate.actor.root.position.copy(mate.pos);
      mate.actor.root.rotation.y = mate.facingYaw;
      animatePitchActor(mate.actor, 'KICK', 0, 0, false, dt, timeSec);
      return { deliveredAssistPass, shotByMateFromUserPass: false };
    }

    const inPrimeBox = mate.pos.z < -29.5 && Math.abs(mate.pos.x) < 12.0;
    const distMateToGk = Math.hypot(mate.pos.x - gkPos.x, mate.pos.z - gkPos.z);
    if (
      cameFromUser &&
      inPrimeBox &&
      mate.shotCooldown <= 0 &&
      distMateToGk > 2.1 &&
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
    mate.holdTimer = 1.35;
  }

  // 2. Com a bola no pé
  if (ball.ownerId === 'MATE') {
    mate.holdTimer -= dt;

    // Se você pediu o passe (A / Y / X), ele entrega NA HORA sem segurar!
    if (mate.queuedCall !== null) {
      deliverPassToUser(mate.queuedCall);
    } else {
      // Nunca se enfia colado em cima do goleiro (para antes de z = -35.5)!
      const goalLaneX =
        mate.pos.x > 3 ? mate.pos.x - 2.5 : mate.pos.x < -3 ? mate.pos.x + 2.5 : mate.pos.x;
      const stopZ = -PITCH.HALF_L + 7.2;
      const dribDir = new THREE.Vector3(goalLaneX - mate.pos.x, 0, stopZ - mate.pos.z);
      if (dribDir.lengthSq() > 0.05) dribDir.normalize();
      const dribSpd = mate.pos.z < stopZ + 0.5 ? 2.5 : 6.2;

      mate.vel.x += (dribDir.x * dribSpd - mate.vel.x) * Math.min(1, 10 * dt);
      mate.vel.z += (dribDir.z * dribSpd - mate.vel.z) * Math.min(1, 10 * dt);
      mate.pos.addScaledVector(mate.vel, dt);
      mate.pos.x = Math.max(-PITCH.HALF_W + 1.2, Math.min(PITCH.HALF_W - 1.2, mate.pos.x));
      mate.pos.z = Math.max(-PITCH.HALF_L + 5.2, Math.min(PITCH.HALF_L - 1.5, mate.pos.z));

      mate.facingYaw +=
        shortestAngleDiff(mate.facingYaw, Math.atan2(mate.vel.x, mate.vel.z)) *
        Math.min(1, 12 * dt);

      ball.pos.set(
        mate.pos.x + Math.sin(mate.facingYaw) * 0.56,
        PITCH.BALL_RADIUS,
        mate.pos.z + Math.cos(mate.facingYaw) * 0.56,
      );
      ball.vel.copy(mate.vel);

      const distToGoal = Math.hypot(mate.pos.x, -PITCH.HALF_L - mate.pos.z);
      const distToGk = Math.hypot(mate.pos.x - gkPos.x, mate.pos.z - gkPos.z);
      const hasGreatShotAngle =
        mate.shotCooldown <= 0 &&
        mate.pos.z < -25.0 &&
        Math.abs(mate.pos.x) < 13.5 &&
        distToGoal < 19.5 &&
        distToGk > 2.2;

      if (commandedMateShoot || (hasGreatShotAngle && mate.holdTimer < 1.0)) {
        shootAtOpenGoalCorner();
      } else if (mate.holdTimer <= 0) {
        const userSpeed = Math.hypot(userVel.x, userVel.z);
        const userRunningForward = userVel.z < -2.6 && userSpeed > 3.2;
        deliverPassToUser(userRunningForward ? 'THROUGH' : 'PASS');
      }
    }
  } else {
    // 3. Sem a bola: Se acabou de chutar (shotCooldown > 0), recua p/ entrada da área em vez de colar no goleiro!
    const mateMaxSprint = 9.1;
    let chasingLooseBall = false;
    let targetX = mate.pos.x;
    let targetZ = mate.pos.z;

    if (ball.ownerId === null && mate.shotCooldown <= 0.8) {
      if (mate.throughRunTarget && mate.throughRunTimer > 0) {
        chasingLooseBall = true;
        const intercept = predictPassInterceptPoint(ball, mate.pos, mateMaxSprint);
        targetX = intercept.x;
        targetZ = intercept.z;
      } else {
        const intercept = predictPassInterceptPoint(ball, mate.pos, mateMaxSprint);
        const mateDistToIntercept = Math.hypot(intercept.x - mate.pos.x, intercept.z - mate.pos.z);
        const userDistToIntercept = Math.hypot(intercept.x - userPos.x, intercept.z - userPos.z);

        // Se você pediu a bola (queuedCall !== null) ou tocou na direção dele, ele dispara pra buscar!
        const userWantsMateToFetch =
          mate.queuedCall !== null && mateDistToIntercept < userDistToIntercept + 3.0;
        const passIntendedForMate =
          ball.lastTouchBy === 'USER' &&
          (userDistToBall > 1.8 || mateDistToIntercept < userDistToIntercept + 5.0) &&
          mateDistToIntercept < 30;
        const looseNearMate =
          distToBall < 13 &&
          intercept.z > -PITCH.HALF_L + 4.2 &&
          mateDistToIntercept <= userDistToIntercept + 1.2;

        if (userWantsMateToFetch || passIntendedForMate || looseNearMate) {
          chasingLooseBall = true;
          targetX = intercept.x;
          targetZ = Math.max(-PITCH.HALF_L + 4.2, intercept.z);
        }
      }
    }

    if (!chasingLooseBall) {
      if (Math.abs(userPos.x) > 9.5 && userPos.z < -18) {
        targetX = userPos.x > 0 ? -3.0 : 3.0;
        targetZ = Math.max(-PITCH.HALF_L + 8.0, Math.min(-30, userPos.z - 3.0));
      } else {
        targetX = userPos.x >= 0 ? -9.5 : 9.5;
        targetZ = Math.max(-PITCH.HALF_L + 9.0, Math.min(12, userPos.z - 4.0));
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
