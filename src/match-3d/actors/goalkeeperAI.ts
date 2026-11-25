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
  /** -1 = Gol Norte (-Z, defendido pelo Visitante); +1 = Gol Sul (+Z, defendido pelo Mandante) */
  goalSideSign: -1 | 1;
  ownerTag: string;
  teamSide: 'HOME' | 'AWAY';
  shirtName: string;
  jersey: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  diveTimer: number;
  diveDir: -1 | 0 | 1;
  diveHeight01: number;
  highJumpTimer: number;
  holdBallTimer: number;
  smotherCooldown: number;
  fakeShotFreezeTimer: number;
  inSpreadStance: boolean;
  spreadCommitTimer: number;
  shotReactionTimer: number;
  trackingShotActive: boolean;
  shotOriginDist: number;
  recentSaveTimer: number;
}

export interface GoalkeeperConfig {
  goalSideSign?: -1 | 1;
  ownerTag?: string;
  teamSide?: 'HOME' | 'AWAY';
  kitColor?: string;
  fullName?: string;
  shirtName?: string;
  jersey?: number;
  ovr?: number;
}

export function createGoalkeeperAI(
  teamClub: ClubData,
  cfg: GoalkeeperConfig = {},
): GoalkeeperBrain {
  const goalSideSign = cfg.goalSideSign ?? -1;
  const ownerTag = cfg.ownerTag ?? 'GK';
  const teamSide = cfg.teamSide ?? (goalSideSign === -1 ? 'AWAY' : 'HOME');
  const kitColor = cfg.kitColor ?? (goalSideSign === -1 ? '#F59E0B' : '#10B981');
  const shirtName = (cfg.shirtName ?? 'GOLEIRO').slice(0, 12).toUpperCase();
  const jersey = cfg.jersey ?? 1;
  const ovr = cfg.ovr ?? teamClub.squadAvgOvr;

  const gkKitClub: ClubData = {
    ...teamClub,
    primaryColor: kitColor,
    secondaryColor: '#111827',
    pattern: 'solid',
  };

  const gkProfile: CareerPlayer = {
    fullName: cfg.fullName ?? 'Goleiro Titular',
    shirtName,
    shirtNumber: jersey,
    age: 27,
    birthDay: 10,
    birthMonth: 3,
    birthYear: 1999,
    nationality: teamClub.country,
    startingLeagueCountry: 'BRA',
    position: 'ATA',
    preferredFoot: 'DIREITA',
    heightCm: 190,
    weightKg: 84,
    appearance: {
      skinTone: goalSideSign === -1 ? '#C68642' : '#E0AC69',
      hairStyle: goalSideSign === -1 ? 'CURTO' : 'DEGRADE',
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
      agility: 82,
      balance: 82,
      stamina: 82,
      strength: 84,
      finishing: 50,
      shotPower: 80,
      longShots: 50,
      positioning: 84,
      shortPass: 74,
      longPass: 80,
      dribbling: 55,
      ballControl: 74,
      tackling: 80,
      interceptions: 82,
    },
    attributeXp: {
      acceleration: 0, sprintSpeed: 0, agility: 0, balance: 0, stamina: 0, strength: 0,
      finishing: 0, shotPower: 0, longShots: 0, positioning: 0, shortPass: 0, longPass: 0,
      dribbling: 0, ballControl: 0, tackling: 0, interceptions: 0,
    },
    overall: ovr,
    reputationStars: 2,
    stamina: 100,
    careerTotals: { matches: 0, goals: 0, assists: 0, threeStarMatches: 0, trophies: 0 },
  };

  const actor = createPitchFootballerActor(gkProfile, gkKitClub);
  const pos = new THREE.Vector3(0, 0, goalSideSign * (PITCH.HALF_L - 0.85));
  actor.root.position.copy(pos);
  actor.root.rotation.y = goalSideSign === -1 ? 0 : Math.PI;

  return {
    actor,
    goalSideSign,
    ownerTag,
    teamSide,
    shirtName,
    jersey,
    pos,
    vel: new THREE.Vector3(),
    diveTimer: 0,
    diveDir: 0,
    diveHeight01: 0.3,
    highJumpTimer: 0,
    holdBallTimer: 0,
    smotherCooldown: 0,
    fakeShotFreezeTimer: 0,
    inSpreadStance: false,
    spreadCommitTimer: 0,
    shotReactionTimer: 0,
    trackingShotActive: false,
    shotOriginDist: 16,
    recentSaveTimer: 0,
  };
}

/**
 * Executa a IA de goleiro em espaço espelhado simétrico (`m = -goalSideSign`),
 * funcionando identicamente para o Gol Norte (-52.5m) e para o Gol Sul (+52.5m)!
 */
export function stepGoalkeeperAI(
  gk: GoalkeeperBrain,
  ball: BallState,
  distributeTargetPos: THREE.Vector3,
  triggeredFakeShotDirX: number | null,
  skillDifficulty01: number,
  dt: number,
  timeSec: number,
): { madeSave: boolean; caughtFirmly: boolean } {
  let madeSave = false;
  let caughtFirmly = false;

  // m = +1 p/ Gol Norte (-HALF_L); m = -1 p/ Gol Sul (+HALF_L).
  // No espaço local (lz = m * z, lvz = m * vz), a linha do gol é SEMPRE -HALF_L e o campo cresce em +Z!
  const m = -gk.goalSideSign;
  const ballLz = m * ball.pos.z;
  const ballLvz = m * ball.vel.z;
  let gkLz = m * gk.pos.z;
  let gkLvz = m * gk.vel.z;
  const baseGoalLz = -PITCH.HALF_L + 0.72;

  gk.smotherCooldown = Math.max(0, gk.smotherCooldown - dt);
  gk.fakeShotFreezeTimer = Math.max(0, gk.fakeShotFreezeTimer - dt);
  gk.recentSaveTimer = Math.max(0, gk.recentSaveTimer - dt);
  gk.highJumpTimer = Math.max(0, gk.highJumpTimer - dt);
  gk.spreadCommitTimer = Math.max(0, gk.spreadCommitTimer - dt);
  if (gk.spreadCommitTimer <= 0) {
    gk.inSpreadStance = false;
  }

  if (
    triggeredFakeShotDirX !== null &&
    ballLz < -PITCH.HALF_L + 15.0 &&
    gk.fakeShotFreezeTimer <= 0
  ) {
    gk.fakeShotFreezeTimer = 0.38;
    gk.vel.set(triggeredFakeShotDirX * 3.4, 0, 0);
    gkLvz = 0;
  }

  // 1. Quando o goleiro encaixou a bola: caminha até a pequena área e distribui com segurança!
  if (ball.ownerId === gk.ownerTag) {
    gk.inSpreadStance = false;
    gk.trackingShotActive = false;
    gk.holdBallTimer -= dt;
    gk.diveDir = 0;

    const walkOutSpd = gkLz < -PITCH.HALF_L + 4.2 ? 2.6 : 0;
    gkLz = Math.min(-PITCH.HALF_L + 4.2, gkLz + walkOutSpd * dt);
    gk.pos.z = m * gkLz;
    gk.vel.set(0, 0, m * walkOutSpd);

    ball.pos.set(gk.pos.x, 1.08, gk.pos.z + m * 0.44);
    ball.vel.set(0, 0, 0);
    ball.spin.set(0, 0, 0);
    ball.enteredGoalSide = null;

    if (gk.holdBallTimer <= 0) {
      ball.ownerId = null;
      ball.lastTouchBy = gk.ownerTag;
      ball.lastTouchTeam = gk.teamSide;
      ball.touchCooldown = 0.35;

      const dx = distributeTargetPos.x - gk.pos.x;
      const dz = distributeTargetPos.z - gk.pos.z;
      const dist = Math.max(4, Math.hypot(dx, dz));
      const dirX = dx / dist;
      const dirZ = dz / dist;

      // Passe rasteiro firme se o companheiro estiver perto (< 26m), ou reposição aérea se longe!
      if (dist < 26) {
        const spd = Math.min(24, Math.max(14, Math.sqrt(2 * BALL_AERO.GRASS_FRICTION * dist + 85)));
        ball.vel.set(dirX * spd, 0.25, dirZ * spd);
      } else {
        const horizSpd = Math.min(25, Math.max(17, dist * 0.68));
        ball.vel.set(dirX * horizSpd, 5.8, dirZ * horizSpd);
      }
      playBallKickSfx(0.62);
    }

    gk.actor.root.position.copy(gk.pos);
    gk.actor.root.rotation.y = gk.goalSideSign === -1 ? 0 : Math.PI;
    animatePitchActor(
      gk.actor,
      walkOutSpd > 0.2 ? 'RUN' : 'IDLE',
      walkOutSpd,
      0,
      false,
      dt,
      timeSec,
    );
    return { madeSave: false, caughtFirmly: false };
  }

  // Detecta início de novo chute contra este gol (inclusive chutes do meio de campo até 62m!)
  const isIncomingShot =
    ball.ownerId === null && ballLvz < -5.5 && ballLz > -PITCH.HALF_L && ballLz < -PITCH.HALF_L + 64;
  if (isIncomingShot && !gk.trackingShotActive) {
    gk.trackingShotActive = true;
    gk.shotOriginDist = Math.hypot(ball.pos.x, -PITCH.HALF_L - ballLz);
    gk.shotReactionTimer =
      gk.shotOriginDist < 13.5
        ? 0.19
        : gk.shotOriginDist < 28.5
          ? 0.21
          : gk.shotOriginDist < 36.0
            ? 0.11
            : 0.04;
  } else if (!isIncomingShot) {
    gk.trackingShotActive = false;
    gk.shotReactionTimer = 0;
  }

  if (gk.shotReactionTimer > 0) {
    gk.shotReactionTimer = Math.max(0, gk.shotReactionTimer - dt);
  }

  const distToBallHoriz = Math.hypot(ball.pos.x - gk.pos.x, ballLz - gkLz);

  // Verifica se quem conduz a bola é um atacante adversário deste goleiro!
  const isOpponentDribbling =
    ball.ownerId !== null &&
    ball.ownerId !== gk.ownerTag &&
    (gk.teamSide === 'AWAY'
      ? ball.ownerId === 'USER' || ball.ownerId === 'MATE' || ball.ownerId.startsWith('HOME_')
      : ball.ownerId.startsWith('AWAY_'));

  if (gk.diveTimer > 0) {
    gk.inSpreadStance = false;
    gk.diveTimer -= dt;
    gk.pos.x += gk.vel.x * dt;
    gkLz += gkLvz * dt;
    gk.pos.x = Math.max(-PITCH.GOAL_HALF_W - 0.5, Math.min(PITCH.GOAL_HALF_W + 0.5, gk.pos.x));
    gkLz = Math.max(-PITCH.HALF_L + 0.35, Math.min(-PITCH.HALF_L + 11.5, gkLz));
    gk.pos.z = m * gkLz;
  } else if (gk.fakeShotFreezeTimer > 0) {
    gk.pos.x += gk.vel.x * dt;
    gk.vel.multiplyScalar(Math.max(0, 1 - 5.2 * dt));
  } else {
    gk.diveDir = 0;

    const distBallFromGoal = Math.hypot(ball.pos.x, ballLz - -PITCH.HALF_L);
    const attackerAdvancing = ballLvz < -0.9;
    const attackerIn1v1Close =
      isOpponentDribbling &&
      Math.abs(ball.pos.x) < 9.0 &&
      ballLz < -PITCH.HALF_L + 9.0;

    let targetX: number;
    let targetLz: number;
    let maxMoveSpd = 4.4 + skillDifficulty01 * 0.95;

    if (attackerIn1v1Close && (ballLz < -PITCH.HALF_L + 6.5 || attackerAdvancing)) {
      maxMoveSpd = 5.2 + skillDifficulty01 * 0.9;
      targetX = ball.pos.x * 0.78;
      targetLz = Math.max(-PITCH.HALF_L + 2.2, Math.min(-PITCH.HALF_L + 7.2, ballLz - 1.35));
      if (distToBallHoriz < 6.0) {
        gk.inSpreadStance = true;
        gk.spreadCommitTimer = 0.6;
      }
    } else {
      const inDefensiveThird = ballLz < -PITCH.HALF_L + 22;
      const maxStepOut = inDefensiveThird ? (attackerAdvancing ? 3.2 : 2.0) : 0.95;
      const stepOutDist = inDefensiveThird
        ? Math.min(maxStepOut, Math.max(0.72, (1 - (distBallFromGoal - 8) / 20) * maxStepOut))
        : 0.85;
      const dirX = ball.pos.x / Math.max(1, distBallFromGoal);
      const dirLz = (ballLz - -PITCH.HALF_L) / Math.max(1, distBallFromGoal);

      targetX = Math.max(
        -PITCH.GOAL_HALF_W + 0.85,
        Math.min(PITCH.GOAL_HALF_W - 0.85, dirX * (stepOutDist + 1.85)),
      );
      targetLz = gk.inSpreadStance
        ? gkLz
        : Math.max(baseGoalLz, -PITCH.HALF_L + dirLz * stepOutDist);
    }

    // 3. Leitura Realista de Curva Magnus em ambos os gols!
    if (isIncomingShot && gk.shotReactionTimer <= 0 && !gk.inSpreadStance) {
      const isVeryFarMidfield = gk.shotOriginDist >= 29.0;
      const isOutsideBoxRange = gk.shotOriginDist >= 14.5;
      if (isOutsideBoxRange) {
        targetLz = baseGoalLz;
        maxMoveSpd = isVeryFarMidfield ? 5.8 : 4.5 + skillDifficulty01 * 0.75;
      }

      const interceptLz = isOutsideBoxRange ? baseGoalLz : gkLz;
      const tHit = (interceptLz - ballLz) / ballLvz;
      if (tHit > 0 && tHit < 1.55) {
        const yAtGk =
          ball.pos.y + ball.vel.y * tHit + 0.5 * BALL_AERO.GRAVITY * tHit * tHit;
        const curveRead = isVeryFarMidfield ? 0.92 : tHit > 0.34 ? 0.18 : 0.72;
        // Aceleração Magnus real em X depende do vel.z mundial (ball.spin.y * ball.vel.z)!
        const magnusAx = ball.spin.y * ball.vel.z * BALL_AERO.MAGNUS_COEFF * 0.82;
        const predX = ball.pos.x + ball.vel.x * tHit + 0.5 * magnusAx * tHit * tHit * curveRead;

        if (Math.abs(predX) < PITCH.GOAL_HALF_W + 1.1) {
          targetX = Math.max(-PITCH.GOAL_HALF_W + 0.35, Math.min(PITCH.GOAL_HALF_W - 0.35, predX));
          const deltaX = predX - gk.pos.x;
          const diveTriggerTime = isVeryFarMidfield ? 0.44 : 0.29;
          if (Math.abs(deltaX) > 0.72 && tHit < diveTriggerTime && yAtGk < PITCH.GOAL_HEIGHT + 0.1) {
            gk.diveDir = deltaX < 0 ? -1 : 1;
            gk.diveTimer = 0.44;
            gk.diveHeight01 = Math.max(0, Math.min(1, (yAtGk - 0.5) / 2.1));
            const diveSpd = isVeryFarMidfield
              ? 6.2 + skillDifficulty01 * 1.5
              : 5.1 + skillDifficulty01 * 1.25;
            gk.vel.set(gk.diveDir * diveSpd, 0, 0);
            gkLvz = 0;
          } else if (Math.abs(deltaX) <= 0.72 && yAtGk > 1.75 && tHit < 0.34) {
            gk.highJumpTimer = 0.38;
          }
        }
      }
    }

    if (gk.diveTimer <= 0) {
      const dx = targetX - gk.pos.x;
      const dlz = targetLz - gkLz;
      const d = Math.hypot(dx, dlz);
      const wishSpd = d > 0.06 ? Math.min(maxMoveSpd, d * 6.2) : 0;
      const wishVx = d > 0.06 ? (dx / d) * wishSpd : 0;
      const wishLvz = d > 0.06 ? (dlz / d) * wishSpd : 0;

      const accel = 14.5;
      gk.vel.x += (wishVx - gk.vel.x) * Math.min(1, accel * dt);
      gkLvz += (wishLvz - gkLvz) * Math.min(1, accel * dt);
      gk.vel.z = m * gkLvz;

      gk.pos.x += gk.vel.x * dt;
      gkLz += gkLvz * dt;
      gk.pos.z = m * gkLz;
    }
  }

  // 4. Abafa nos pés 1x1 somente se o atacante trombar direto em cima dele (< 1.08m)
  const currDistHoriz = Math.hypot(ball.pos.x - gk.pos.x, ballLz - gkLz);
  if (
    isOpponentDribbling &&
    gk.smotherCooldown <= 0 &&
    currDistHoriz < 1.08 &&
    ball.pos.y < 1.2
  ) {
    madeSave = true;
    caughtFirmly = true;
    gk.smotherCooldown = 1.0;
    gk.diveDir = ball.pos.x < gk.pos.x ? -1 : 1;
    gk.diveTimer = 0.3;
    gk.vel.set(0, 0, 0);
    playBallKickSfx(0.7);
    ball.ownerId = gk.ownerTag;
    ball.lastTouchBy = gk.ownerTag;
    ball.lastTouchTeam = gk.teamSide;
    gk.holdBallTimer = 0.95;
  } else if (
    // 5. Defesa de Chutes COM CONTATO VISUAL REAL nas luvas/tronco!
    ball.ownerId === null &&
    ball.touchCooldown <= 0.19 &&
    ballLz > -PITCH.HALF_L - 0.1
  ) {
    const dlz = Math.abs(ballLz - gkLz);
    const hitCenterX =
      gk.diveTimer > 0 && gk.diveDir !== 0 ? gk.pos.x + gk.diveDir * 0.56 : gk.pos.x;
    const halfSpanX = gk.inSpreadStance ? 0.96 : gk.diveTimer > 0 ? 0.68 : 0.52;

    const minReachY = gk.diveTimer > 0 && gk.diveHeight01 > 0.65 ? 0.55 : 0;
    const maxReachY = gk.inSpreadStance
      ? 1.28
      : gk.diveTimer > 0
        ? 0.95 + gk.diveHeight01 * 1.68
        : gk.highJumpTimer > 0
          ? 2.68
          : 1.98;

    const dx = Math.abs(ball.pos.x - hitCenterX);
    const inHeightBand = ball.pos.y >= minReachY && ball.pos.y <= maxReachY;

    const movingTowardGoalOrLooseClose =
      ballLvz < -1.0 || (currDistHoriz < 0.85 && ballLz < -PITCH.HALF_L + 8.5 && ball.lastTouchBy !== gk.ownerTag);

    if (dx <= halfSpanX && dlz <= 0.48 && inHeightBand && movingTowardGoalOrLooseClose) {
      madeSave = true;
      const isVeryFar = gk.shotOriginDist >= 28.5;
      if (ball.pos.y > 1.7 && gk.diveTimer <= 0 && !gk.inSpreadStance) {
        gk.highJumpTimer = 0.35;
      }
      const shotSpeed = ball.vel.length();
      playBallKickSfx(0.7);

      let catchChance = 0;
      if (gk.recentSaveTimer > 0) {
        catchChance = 0.92;
      } else if (isVeryFar && shotSpeed < 27.0) {
        catchChance = 0.78;
      } else if (shotSpeed < 20.0 && gk.diveTimer <= 0 && !gk.inSpreadStance) {
        catchChance = 0.8;
      } else if (shotSpeed < 24.5 && dx < 0.45 && gk.diveTimer <= 0) {
        catchChance = 0.45;
      } else {
        catchChance = 0.08;
      }

      gk.recentSaveTimer = 2.4;

      if (Math.random() < catchChance) {
        caughtFirmly = true;
        ball.ownerId = gk.ownerTag;
        ball.lastTouchBy = gk.ownerTag;
        ball.lastTouchTeam = gk.teamSide;
        gk.holdBallTimer = 0.95;
      } else {
        const pushSide =
          Math.abs(ball.pos.x - gk.pos.x) > 0.18
            ? ball.pos.x >= gk.pos.x
              ? 1
              : -1
            : Math.random() < 0.5
              ? -1
              : 1;
        ball.lastTouchBy = gk.ownerTag;
        ball.lastTouchTeam = gk.teamSide;
        ball.touchCooldown = 0.35;
        const reboundSideSpd = 9.5 + Math.random() * 5.0;
        const reboundOutLz = 6.5 + Math.min(6.5, Math.abs(ballLvz) * 0.25);
        ball.vel.set(pushSide * reboundSideSpd, 2.0 + Math.random() * 2.2, m * reboundOutLz);
        ball.spin.multiplyScalar(0.3);
      }
    }
  }

  gk.actor.root.position.copy(gk.pos);
  const baseYaw = gk.goalSideSign === -1 ? 0 : Math.PI;
  const rawLookYaw = Math.atan2(ball.pos.x - gk.pos.x, ball.pos.z - gk.pos.z);
  let yawDiff = ((rawLookYaw - baseYaw + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
  gk.actor.root.rotation.y = baseYaw + yawDiff * 0.42;

  const gkSpd = Math.hypot(gk.vel.x, gk.vel.z);
  // Espelha a inclinação local da ponte quando o goleiro está no Gol Sul olhando para -Z!
  const localDiveSign = (gk.diveDir * m) as -1 | 0 | 1;
  const pose: PitchPoseState =
    localDiveSign === -1
      ? 'GK_DIVE_LEFT'
      : localDiveSign === 1
        ? 'GK_DIVE_RIGHT'
        : gk.highJumpTimer > 0
          ? 'GK_JUMP_HIGH'
          : gk.inSpreadStance
            ? 'GK_SPREAD_LOW'
            : gkSpd > 3.2
              ? 'RUN'
              : 'GK_READY';
  animatePitchActor(
    gk.actor,
    pose,
    gkSpd,
    gk.diveTimer > 0 ? gk.diveHeight01 : 0,
    false,
    dt,
    timeSec,
  );

  return { madeSave, caughtFirmly };
}
