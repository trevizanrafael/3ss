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
  spreadCommitTimer: number;
  /** Tempo humano de reação (impede virar o Neuer pegando 100% no mano a mano e impede adivinhar curva antes da hora!) */
  shotReactionTimer: number;
  trackingShotActive: boolean;
  shotOriginDist: number;
  /** Evita loop infinito de rebote/espalmada na pequena área: se já salvou há <2s, encaixa a próxima! */
  recentSaveTimer: number;
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
    spreadCommitTimer: 0,
    shotReactionTimer: 0,
    trackingShotActive: false,
    shotOriginDist: 16,
    recentSaveTimer: 0,
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
  gk.recentSaveTimer = Math.max(0, gk.recentSaveTimer - dt);
  gk.spreadCommitTimer = Math.max(0, gk.spreadCommitTimer - dt);
  if (gk.spreadCommitTimer <= 0) {
    gk.inSpreadStance = false;
  }

  if (triggeredFakeShotDirX !== null && ball.pos.z < -27.5 && gk.fakeShotFreezeTimer <= 0) {
    gk.fakeShotFreezeTimer = 0.38;
    gk.vel.set(triggeredFakeShotDirX * 3.4, 0, 0);
  }

  // 1. Quando o goleiro encaixou a bola: caminha até a pequena área e repõe limpo!
  if (ball.ownerId === 'GK') {
    gk.inSpreadStance = false;
    gk.trackingShotActive = false;
    gk.holdBallTimer -= dt;
    gk.diveDir = 0;
    const walkOutSpd = gk.pos.z < -PITCH.HALF_L + 3.4 ? 2.2 : 0;
    gk.pos.z = Math.min(-PITCH.HALF_L + 3.4, gk.pos.z + walkOutSpd * dt);
    ball.pos.set(gk.pos.x, 1.08, gk.pos.z + 0.42);
    ball.vel.set(0, 0, 0);
    ball.spin.set(0, 0, 0);
    ball.enteredGoalSide = null;
    if (gk.holdBallTimer <= 0) {
      ball.ownerId = null;
      ball.lastTouchBy = 'GK';
      ball.touchCooldown = 0.35;
      const aimZ = Math.max(-14, userPos.z);
      const toUser = new THREE.Vector3(userPos.x - gk.pos.x, 0, aimZ - gk.pos.z).normalize();
      ball.vel.set(toUser.x * 18.0, 4.2, toUser.z * 18.0);
      playBallKickSfx(0.62);
    }
    gk.actor.root.position.copy(gk.pos);
    gk.actor.root.rotation.y = 0;
    animatePitchActor(gk.actor, walkOutSpd > 0.2 ? 'RUN' : 'IDLE', walkOutSpd, 0, false, dt, timeSec);
    return { madeSave: false, caughtFirmly: false };
  }

  // Detecta início de novo chute contra o gol para disparar o tempo humano de reação!
  const isIncomingShot =
    ball.ownerId === null && ball.vel.z < -5.5 && ball.pos.z > -PITCH.HALF_L;
  if (isIncomingShot && !gk.trackingShotActive) {
    gk.trackingShotActive = true;
    gk.shotOriginDist = Math.hypot(ball.pos.x, -PITCH.HALF_L - ball.pos.z);
    // Reação humana real também fora da área (~0.21s) p/ NÃO adivinhar e correr pro canto antes da bola curvar!
    gk.shotReactionTimer =
      gk.shotOriginDist < 13.5 ? 0.19 : gk.shotOriginDist < 27.5 ? 0.21 : 0.12;
  } else if (!isIncomingShot) {
    gk.trackingShotActive = false;
    gk.shotReactionTimer = 0;
  }

  if (gk.shotReactionTimer > 0) {
    gk.shotReactionTimer = Math.max(0, gk.shotReactionTimer - dt);
  }

  const distToBallHoriz = Math.hypot(ball.pos.x - gk.pos.x, ball.pos.z - gk.pos.z);

  if (gk.diveTimer > 0) {
    gk.inSpreadStance = false;
    gk.diveTimer -= dt;
    gk.pos.x += gk.vel.x * dt;
    gk.pos.z += gk.vel.z * dt;
    gk.pos.x = Math.max(-PITCH.GOAL_HALF_W - 0.5, Math.min(PITCH.GOAL_HALF_W + 0.5, gk.pos.x));
    gk.pos.z = Math.max(-PITCH.HALF_L + 0.35, Math.min(-PITCH.HALF_L + 10.5, gk.pos.z));
  } else if (gk.fakeShotFreezeTimer > 0) {
    gk.pos.x += gk.vel.x * dt;
    gk.vel.multiplyScalar(Math.max(0, 1 - 5.2 * dt));
  } else {
    gk.diveDir = 0;

    // 2. Posicionamento Equilibrado:
    // - Se a bola está LONGE (z > -25), fica cravado perto da linha (z = -41.2) -> IMPOSSÍVEL tomar gol bobo de cobertura de longe!
    // - No MANO A MANO (z < -33.5), sai pra fechar o meio e ajoelha (GK_SPREAD_LOW), mas deixa os cantos do gol de 9m abertos p/ finalização colocada/forte ou cavadinha!
    const distBallFromGoal = Math.hypot(ball.pos.x, ball.pos.z - -PITCH.HALF_L);
    const attackerAdvancing = ball.vel.z < -0.9;
    const attackerIn1v1Close =
      (ball.ownerId === 'USER' || ball.ownerId === 'MATE') &&
      Math.abs(ball.pos.x) < 8.5 &&
      ball.pos.z < -33.5;

    let targetX: number;
    let targetZ: number;
    let maxMoveSpd = 4.4 + skillDifficulty01 * 0.95;

    if (attackerIn1v1Close && (ball.pos.z < -35.8 || attackerAdvancing)) {
      maxMoveSpd = 5.2 + skillDifficulty01 * 0.9;
      targetX = ball.pos.x * 0.78;
      targetZ = Math.max(-PITCH.HALF_L + 2.2, Math.min(-PITCH.HALF_L + 6.8, ball.pos.z - 1.35));
      if (distToBallHoriz < 6.0) {
        gk.inSpreadStance = true;
        // Mantém ajoelhado por 0.6s mesmo após a bola sair do pé p/ permitir a Cavadinha (LB+B) encobrir!
        gk.spreadCommitTimer = 0.6;
      }
    } else {
      const maxStepOut = ball.pos.z < -25 ? (attackerAdvancing ? 3.1 : 1.9) : 0.75;
      const stepOutDist =
        ball.pos.z < -25
          ? Math.min(maxStepOut, Math.max(0.72, (1 - (distBallFromGoal - 8) / 18) * maxStepOut))
          : 0.72;
      const dirX = ball.pos.x / Math.max(1, distBallFromGoal);
      const dirZ = (ball.pos.z - -PITCH.HALF_L) / Math.max(1, distBallFromGoal);

      targetX = Math.max(
        -PITCH.GOAL_HALF_W + 0.85,
        Math.min(PITCH.GOAL_HALF_W - 0.85, dirX * (stepOutDist + 1.85)),
      );
      targetZ = gk.inSpreadStance ? gk.pos.z : Math.max(baseGoalZ, -PITCH.HALF_L + dirZ * stepOutDist);
    }

    // 3. Leitura Realista de Curva (NÃO pula adiantado adivinhando a chapada de fora da área!):
    // - No começo do voo, lê apenas a tangente inicial (~18% da curva: é enganado pelo arco abrindo por fora!)
    // - Só quando a bola já está chegando perto (< 0.30s) ele percebe a curva fechando na gaveta e salta!
    // - Mas se for do meio da rua (> 29m), o voo é tão longo que dá tempo dele corrigir e pegar!
    if (isIncomingShot && gk.shotReactionTimer <= 0 && !gk.inSpreadStance) {
      const isVeryFarMidfield = gk.shotOriginDist >= 29.0;
      const isOutsideBoxRange = gk.shotOriginDist >= 14.5;
      if (isOutsideBoxRange) {
        targetZ = baseGoalZ;
        maxMoveSpd = isVeryFarMidfield ? 5.8 : 4.5 + skillDifficulty01 * 0.75;
      }

      const interceptZ = isOutsideBoxRange ? baseGoalZ : gk.pos.z;
      const tHit = (interceptZ - ball.pos.z) / ball.vel.z;
      if (tHit > 0 && tHit < 1.55) {
        const yAtGk =
          ball.pos.y + ball.vel.y * tHit + 0.5 * BALL_AERO.GRAVITY * tHit * tHit;
        // Longe no começo do voo (tHit > 0.34s), enxerga só a saída da bola; perto (< 0.34s), vê a curva virar!
        const curveRead = isVeryFarMidfield
          ? 0.92
          : tHit > 0.34
            ? 0.18
            : 0.72;
        const magnusAx = ball.spin.y * ball.vel.z * BALL_AERO.MAGNUS_COEFF * 0.82;
        const predX = ball.pos.x + ball.vel.x * tHit + 0.5 * magnusAx * tHit * tHit * curveRead;

        if (Math.abs(predX) < PITCH.GOAL_HALF_W + 1.1) {
          targetX = Math.max(-PITCH.GOAL_HALF_W + 0.35, Math.min(PITCH.GOAL_HALF_W - 0.35, predX));
          const deltaX = predX - gk.pos.x;
          // Só salta quando a bola realmente está chegando perto (tHit < 0.30s), nunca 1 segundo antes!
          const diveTriggerTime = isVeryFarMidfield ? 0.44 : 0.29;
          if (Math.abs(deltaX) > 0.95 && tHit < diveTriggerTime && yAtGk < PITCH.GOAL_HEIGHT + 0.1) {
            gk.diveDir = deltaX < 0 ? -1 : 1;
            gk.diveTimer = 0.44;
            const diveSpd = isVeryFarMidfield
              ? 6.2 + skillDifficulty01 * 1.5
              : 5.1 + skillDifficulty01 * 1.25;
            gk.vel.set(gk.diveDir * diveSpd, 0, 0);
          }
        }
      }
    }

    if (gk.diveTimer <= 0) {
      const dx = targetX - gk.pos.x;
      const dz = targetZ - gk.pos.z;
      const d = Math.hypot(dx, dz);
      const wishSpd = d > 0.06 ? Math.min(maxMoveSpd, d * 6.2) : 0;
      const wishVx = d > 0.06 ? (dx / d) * wishSpd : 0;
      const wishVz = d > 0.06 ? (dz / d) * wishSpd : 0;

      const accel = 14.5;
      gk.vel.x += (wishVx - gk.vel.x) * Math.min(1, accel * dt);
      gk.vel.z += (wishVz - gk.vel.z) * Math.min(1, accel * dt);
      gk.pos.addScaledVector(gk.vel, dt);
    }
  }

  // 4. Abafa nos pés 1x1 somente se você trombar direto em cima dele (< 1.08m)!
  const currDistHoriz = Math.hypot(ball.pos.x - gk.pos.x, ball.pos.z - gk.pos.z);
  if (
    (ball.ownerId === 'USER' || ball.ownerId === 'MATE') &&
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
    ball.ownerId = 'GK';
    ball.lastTouchBy = 'GK';
    gk.holdBallTimer = 0.95;
  } else if (
    // 5. Defesa de Chutes:
    // - De longe (shotOriginDist >= 16.5m): alcance alto até 2.98m (pega cavadinha/chapadinha mansa de longe!)
    // - No mano a mano (< 14m): alcance humano enxuto (deixa os cantos do gol de 9m livres se bater colocado/forte!)
    ball.ownerId === null &&
    ball.touchCooldown <= 0.19 &&
    ball.pos.z > -PITCH.HALF_L - 0.1
  ) {
    const isVeryFar = gk.shotOriginDist >= 28.5;
    const reachX = gk.inSpreadStance
      ? 1.06
      : gk.diveTimer > 0
        ? isVeryFar
          ? 1.45
          : 1.2
        : isVeryFar
          ? 0.98
          : 0.8;
    const reachZ = 0.85;
    const reachY = gk.inSpreadStance
      ? 1.32
      : isVeryFar
        ? 2.98
        : gk.diveTimer > 0
          ? 2.62
          : 2.45;

    const dx = Math.abs(ball.pos.x - gk.pos.x);
    const dz = Math.abs(ball.pos.z - gk.pos.z);

    const movingTowardGoalOrLooseClose =
      ball.vel.z < -1.0 || (currDistHoriz < 0.95 && ball.pos.z < -34);

    if (dx < reachX && dz < reachZ && ball.pos.y < reachY && movingTowardGoalOrLooseClose) {
      madeSave = true;
      const shotSpeed = ball.vel.length();
      playBallKickSfx(0.7);

      // ANTI-PINGUE-PONGUE INFINITO: se já fez uma defesa há menos de 2.2s, OU se for bola mansa de longe, AGARRA FIRME!
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
        ball.ownerId = 'GK';
        ball.lastTouchBy = 'GK';
        gk.holdBallTimer = 0.95;
      } else {
        // Espalma BEM AFASTADO pros lados/frente p/ nunca ficar preso quicando no atacante colado!
        const pushSide =
          Math.abs(ball.pos.x - gk.pos.x) > 0.18
            ? ball.pos.x >= gk.pos.x
              ? 1
              : -1
            : Math.random() < 0.5
              ? -1
              : 1;
        ball.lastTouchBy = 'GK';
        ball.touchCooldown = 0.35;
        const reboundSideSpd = 9.5 + Math.random() * 5.0;
        const reboundOutZ = 6.5 + Math.min(6.5, Math.abs(ball.vel.z) * 0.25);
        ball.vel.set(pushSide * reboundSideSpd, 2.0 + Math.random() * 2.2, reboundOutZ);
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
