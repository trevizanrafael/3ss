import * as THREE from 'three';
import { CareerPlayer } from '../../domains/player/playerTypes';
import { playBallKickSfx } from '../audio/matchAudio';
import { LivePitchInput } from '../input/usePitchInput';
import { KickKind } from '../types';
import { BALL_AERO, BallState } from './ballPhysics';
import { PITCH } from './pitchConstants';

type ChargeIntent = 'SHOT' | 'PASS' | 'THROUGH' | 'CROSS' | null;

export interface PlayerPitchState {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  facingYaw: number;
  stamina: number;
  maxStamina: number;
  powerCharge01: number;
  chargeIntent: ChargeIntent;
  chargingFinesse: boolean;
  chargingChip: boolean;
  windupTimer: number;
  lockedPower01: number;
  lockedIntent: 'SHOT' | 'CROSS' | null;
  suppressButtonsUntilRelease: boolean;
  fakeShotAnimTimer: number;
  lastKickUsedLeftFoot: boolean;
  hudPower01: number;
  hudPowerHoldTimer: number;
  kickAnimTimer: number;
  slideTimer: number;
}

const tmpForward = new THREE.Vector3();
const tmpRight = new THREE.Vector3();
const tmpWish = new THREE.Vector3();

export function createInitialPlayerPitchState(startStamina = 100): PlayerPitchState {
  const cap = Math.max(25, Math.min(100, startStamina));
  return {
    pos: new THREE.Vector3(0, 0, -11),
    vel: new THREE.Vector3(0, 0, 0),
    facingYaw: 0,
    stamina: cap,
    maxStamina: cap,
    powerCharge01: 0,
    chargeIntent: null,
    chargingFinesse: false,
    chargingChip: false,
    windupTimer: 0,
    lockedPower01: 0,
    lockedIntent: null,
    suppressButtonsUntilRelease: false,
    fakeShotAnimTimer: 0,
    lastKickUsedLeftFoot: false,
    hudPower01: 0,
    hudPowerHoldTimer: 0,
    kickAnimTimer: 0,
    slideTimer: 0,
  };
}

function shortestAngleDiff(from: number, to: number): number {
  let diff = ((to - from + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

/**
 * Escolhe automaticamente o MELHOR CANTO ABERTO DO GOL longe do goleiro!
 * Só força o outro canto se você inclinar bastante o analógico (> 58%) de propósito.
 */
function pickSmartBestCornerSign(
  ballPos: THREE.Vector3,
  gkPos: THREE.Vector3,
  stickMoveX: number,
): -1 | 1 {
  if (stickMoveX < -0.58) return -1;
  if (stickMoveX > 0.58) return 1;

  // Mede o corredor livre à esquerda (-4.5 .. gk.x) vs à direita (gk.x .. +4.5)
  const openLeft = gkPos.x - -PITCH.GOAL_HALF_W;
  const openRight = PITCH.GOAL_HALF_W - gkPos.x;

  if (Math.abs(openRight - openLeft) > 0.35) {
    return openRight > openLeft ? 1 : -1;
  }
  // Se o goleiro estiver centralizado, bate cruzado no canto mais amplo!
  if (Math.abs(stickMoveX) > 0.2) {
    return stickMoveX < 0 ? -1 : 1;
  }
  return ballPos.x >= 0 ? -1 : 1;
}

/**
 * Calcula chute tenso de linha reta/curva controlada SEM NUNCA virar balão de cobertura de longe!
 */
function solveTenseShotVelocity(
  startPos: THREE.Vector3,
  targetX: number,
  targetY: number,
  horizSpeed: number,
  spinX: number,
  spinY: number,
): THREE.Vector3 {
  const goalZ = -PITCH.HALF_L;
  const distZ = Math.max(3.5, Math.abs(goalZ - startPos.z));
  const estT = distZ / Math.max(15, horizSpeed * 0.94);

  let vx = (targetX - startPos.x) / estT;
  const maxVx = horizSpeed * 0.72;
  vx = Math.max(-maxVx, Math.min(maxVx, vx));
  const vz = -Math.sqrt(Math.max(130, horizSpeed * horizSpeed - vx * vx));

  // Limita vy máximo para que chutes de longe sejam SEMPRE tensos (teto máx ~2.85m, nunca balão!)
  const rawVy = (targetY - startPos.y - 0.5 * BALL_AERO.GRAVITY * estT * estT) / estT;
  let vy = Math.max(0.9, Math.min(8.6, rawVy));

  for (let iter = 0; iter < 2; iter++) {
    let px = startPos.x;
    let py = startPos.y;
    let pz = startPos.z;
    let svx = vx;
    let svy = vy;
    let svz = vz;
    let sSpinX = spinX;
    let sSpinY = spinY;
    const h = 1 / 120;
    let elapsed = 0;

    for (let step = 0; step < 190 && pz > goalZ; step++) {
      svy += BALL_AERO.GRAVITY * h;
      const drag = 1 - BALL_AERO.AIR_DRAG * h;
      svx *= drag;
      svy *= drag;
      svz *= drag;

      const cx = sSpinY * svz;
      const cy = -sSpinX * svz;
      const cz = sSpinX * svy - sSpinY * svx;
      svx += cx * BALL_AERO.MAGNUS_COEFF * h;
      svy += cy * BALL_AERO.MAGNUS_COEFF * h;
      svz += cz * BALL_AERO.MAGNUS_COEFF * h;

      const decay = 1 - 0.35 * h;
      sSpinX *= decay;
      sSpinY *= decay;

      px += svx * h;
      py += svy * h;
      pz += svz * h;
      elapsed += h;
    }

    if (elapsed > 0.04) {
      vx += ((targetX - px) / elapsed) * 0.94;
      vy = Math.max(0.9, Math.min(8.8, vy + ((targetY - py) / elapsed) * 0.85));
    }
  }

  return new THREE.Vector3(vx, vy, vz);
}

export function stepPlayerAndBallControl(
  pState: PlayerPitchState,
  player: CareerPlayer,
  ball: BallState,
  input: LivePitchInput,
  camYaw: number,
  teammatePos: THREE.Vector3,
  teammateVel: THREE.Vector3,
  gkPos: THREE.Vector3,
  dt: number,
): {
  kicked: KickKind | null;
  calledForBall: 'PASS' | 'THROUGH' | 'CROSS' | null;
  commandedMateShoot: boolean;
  triggeredFakeShotDirX: number | null;
  throughBallTarget: THREE.Vector3 | null;
} {
  const attrs = player.attributes;
  pState.kickAnimTimer = Math.max(0, pState.kickAnimTimer - dt);
  pState.slideTimer = Math.max(0, pState.slideTimer - dt);
  pState.fakeShotAnimTimer = Math.max(0, pState.fakeShotAnimTimer - dt);

  if (
    pState.suppressButtonsUntilRelease &&
    !input.shootHeld &&
    !input.passHeld &&
    !input.lobHeld
  ) {
    pState.suppressButtonsUntilRelease = false;
  }

  if (pState.hudPowerHoldTimer > 0) {
    pState.hudPowerHoldTimer = Math.max(0, pState.hudPowerHoldTimer - dt);
    if (pState.hudPowerHoldTimer <= 0 && pState.chargeIntent === null && pState.windupTimer <= 0) {
      pState.hudPower01 = 0;
    }
  }

  // 1. Movimentação relativa à câmera
  tmpForward.set(-Math.sin(camYaw), 0, -Math.cos(camYaw)).normalize();
  tmpRight.set(Math.cos(camYaw), 0, -Math.sin(camYaw)).normalize();

  tmpWish
    .set(0, 0, 0)
    .addScaledVector(tmpRight, input.moveX)
    .addScaledVector(tmpForward, -input.moveZ);

  const wishMag = Math.min(1, tmpWish.length());
  if (wishMag > 0.01) tmpWish.normalize();

  const baseJogSpeed = 5.6 + (attrs.agility / 99) * 1.45;
  const maxSprintSpeed = 7.8 + (attrs.sprintSpeed / 99) * 3.15;
  const canSprint = input.sprintHeld && pState.stamina > 5 && pState.slideTimer <= 0;

  const fatigueCapFactor = 0.86 + (pState.maxStamina / 100) * 0.14;
  let targetSpeed =
    wishMag *
    (canSprint
      ? maxSprintSpeed * fatigueCapFactor
      : input.closeControlHeld
        ? baseJogSpeed * 0.72
        : baseJogSpeed);

  if (ball.ownerId === 'USER' && pState.fakeShotAnimTimer <= 0) {
    const dribbleEfficiency = 0.87 + (attrs.dribbling / 99) * 0.11;
    targetSpeed *= dribbleEfficiency;
  }

  if (pState.slideTimer > 0) {
    pState.vel.multiplyScalar(Math.max(0, 1 - 3.2 * dt));
  } else if (pState.fakeShotAnimTimer > 0) {
    if (pState.fakeShotAnimTimer < 0.22) {
      pState.vel.multiplyScalar(Math.max(0, 1 - 1.5 * dt));
    }
  } else {
    const accelRate = 11.0 + (attrs.acceleration / 99) * 8.5;
    pState.vel.x += (tmpWish.x * targetSpeed - pState.vel.x) * Math.min(1, accelRate * dt);
    pState.vel.z += (tmpWish.z * targetSpeed - pState.vel.z) * Math.min(1, accelRate * dt);
  }

  pState.pos.addScaledVector(pState.vel, dt);
  pState.pos.x = Math.max(-PITCH.HALF_W - 1.5, Math.min(PITCH.HALF_W + 1.5, pState.pos.x));
  pState.pos.z = Math.max(-PITCH.HALF_L - 1.5, Math.min(PITCH.HALF_L + 1.5, pState.pos.z));

  const enduranceFactor = 1.25 - (attrs.stamina / 99) * 0.55;
  if (canSprint && wishMag > 0.2) {
    pState.stamina = Math.max(0, pState.stamina - 7.2 * enduranceFactor * dt);
  } else {
    pState.stamina = Math.min(pState.maxStamina, pState.stamina + 4.2 * dt);
  }

  const horizSpeed = Math.hypot(pState.vel.x, pState.vel.z);
  if (horizSpeed > 0.25) {
    const desiredYaw = Math.atan2(pState.vel.x, pState.vel.z);
    const turnRate = pState.fakeShotAnimTimer > 0 ? 24 : 11.5 + (attrs.agility / 99) * 7;
    pState.facingYaw += shortestAngleDiff(pState.facingYaw, desiredYaw) * Math.min(1, turnRate * dt);
  }

  // 2. Domínio e condução da bola
  const distToBall = Math.hypot(ball.pos.x - pState.pos.x, ball.pos.z - pState.pos.z);
  const controlRadius = 0.92 + (attrs.ballControl / 99) * 0.34;

  if (
    ball.ownerId === null &&
    ball.touchCooldown <= 0 &&
    distToBall < controlRadius &&
    ball.pos.y < 1.55
  ) {
    ball.ownerId = 'USER';
    ball.lastTouchBy = 'USER';
    ball.spin.set(0, 0, 0);
  }

  if (ball.ownerId === 'USER') {
    const footSide = player.preferredFoot === 'ESQUERDA' ? -0.14 : 0.14;
    const leadDist =
      pState.fakeShotAnimTimer > 0
        ? 0.52
        : input.closeControlHeld
          ? 0.48
          : canSprint
            ? 0.74
            : 0.58;
    const sinY = Math.sin(pState.facingYaw);
    const cosY = Math.cos(pState.facingYaw);

    const targetBx = pState.pos.x + sinY * leadDist + cosY * footSide;
    const targetBz = pState.pos.z + cosY * leadDist - sinY * footSide;

    const snapRate = pState.fakeShotAnimTimer > 0 ? 34 : 22;
    ball.pos.x += (targetBx - ball.pos.x) * Math.min(1, snapRate * dt);
    ball.pos.z += (targetBz - ball.pos.z) * Math.min(1, snapRate * dt);
    ball.pos.y = PITCH.BALL_RADIUS;
    ball.vel.copy(pState.vel);
  }

  // 3. Ações com bola vs Sem bola (A pede passe na hora!)
  let kicked: KickKind | null = null;
  let calledForBall: 'PASS' | 'THROUGH' | 'CROSS' | null = null;
  let commandedMateShoot = false;
  let triggeredFakeShotDirX: number | null = null;
  let throughBallTarget: THREE.Vector3 | null = null;

  const canStrike =
    ball.ownerId === 'USER' ||
    (ball.ownerId === null && distToBall < 1.45 && ball.pos.y < 1.85);

  // FINGIR CHUTE (B depois A, ou X depois A)
  if (
    canStrike &&
    (pState.chargeIntent === 'SHOT' ||
      pState.chargeIntent === 'CROSS' ||
      pState.windupTimer > 0) &&
    input.passJustPressed
  ) {
    const fakedDirX = pState.pos.x >= 0 ? -1 : 1;
    pState.chargeIntent = null;
    pState.windupTimer = 0;
    pState.powerCharge01 = 0;
    pState.chargingFinesse = false;
    pState.chargingChip = false;
    pState.hudPower01 = 0;
    pState.hudPowerHoldTimer = 0;
    pState.suppressButtonsUntilRelease = true;
    pState.lastKickUsedLeftFoot = player.preferredFoot === 'ESQUERDA';

    const cutDir = new THREE.Vector3();
    if (wishMag > 0.16) {
      cutDir.copy(tmpWish);
    } else {
      const sideSign = player.preferredFoot === 'ESQUERDA' ? -1 : 1;
      const cutYaw = pState.facingYaw + sideSign * 1.02;
      cutDir.set(Math.sin(cutYaw), 0, Math.cos(cutYaw)).normalize();
    }

    const burstSpd = 8.2 + (attrs.dribbling / 99) * 2.5 + (attrs.agility / 99) * 1.1;
    pState.vel.set(cutDir.x * burstSpd, 0, cutDir.z * burstSpd);
    pState.facingYaw = Math.atan2(cutDir.x, cutDir.z);
    pState.fakeShotAnimTimer = 0.34;
    ball.ownerId = 'USER';
    ball.lastTouchBy = 'USER';
    playBallKickSfx(0.28);
    triggeredFakeShotDirX = fakedDirX;

    return {
      kicked: null,
      calledForBall: null,
      commandedMateShoot: false,
      triggeredFakeShotDirX,
      throughBallTarget: null,
    };
  }

  const executeStrike = (
    intent: 'SHOT' | 'PASS' | 'THROUGH' | 'CROSS',
    power: number,
    isFinesse: boolean,
    isChip: boolean,
  ) => {
    const baseAim = wishMag > 0.18 ? tmpWish.clone() : tmpForward.clone();
    const finSkill = attrs.finishing / 99;
    const distFromGoalLine = Math.max(3.5, Math.abs(-PITCH.HALF_L - ball.pos.z));

    ball.ownerId = null;
    ball.lastTouchBy = 'USER';
    ball.touchCooldown = 0.24;

    if (intent === 'SHOT') {
      // MIRA INTELIGENTE NO MELHOR CANTO ABERTO DO GOL (tira do goleiro automaticamente!)
      const bestSide = pickSmartBestCornerSign(ball.pos, gkPos, input.moveX);

      if (isChip) {
        // CAVADINHA (LB + B): Parábola gravitacional pura (sobe redondinha e cai de cima pra baixo no gol!)
        pState.lastKickUsedLeftFoot = player.preferredFoot === 'ESQUERDA';
        const errorX = (Math.random() - 0.5) * (1 - finSkill) * 0.9;
        const targetX = bestSide * (2.1 + finSkill * 1.1) + errorX;
        const dx = targetX - ball.pos.x;
        const dz = -PITCH.HALF_L + 0.95 - ball.pos.z;
        const rawDist = Math.max(3.8, Math.hypot(dx, dz));
        const dirX = dx / rawDist;
        const dirZ = dz / rawDist;

        const g = Math.abs(BALL_AERO.GRAVITY);
        const carryDist = Math.min(rawDist + 0.6, 6.2 + power * 13.5);
        const overChip = power > 0.86 ? (power - 0.86) * 6.5 : 0;
        const peakH = 2.25 + power * 1.05 + overChip;

        // Parábola exata: vy0 sobe até peakH e depois despenca de cima pra baixo dentro do gol!
        const vy0 = Math.sqrt(2 * g * Math.max(1.2, peakH - ball.pos.y));
        const tUp = vy0 / g;
        const tDown = Math.sqrt((2 * Math.max(0.4, peakH - 0.55)) / g);
        const totalFlightT = (tUp + tDown) * 0.94; // Compensa leve arrasto do ar
        const horizSpd = carryDist / totalFlightT;

        ball.vel.set(dirX * horizSpd, vy0, dirZ * horizSpd);
        ball.spin.set(0, 0, 0); // Sem flutuação artificial: queda limpa de parábola!
        pState.facingYaw = Math.atan2(dirX, dirZ);
        kicked = 'CHIP_SHOT';
        playBallKickSfx(0.42 + power * 0.25);
      } else if (isFinesse) {
        // CHUTE COLOCADO CHAPADO (RB + B) — FÍSICA REAL DE FORA PRA DENTRO + PERNA DE TRÁS CORRETA:
        // • Na ESQUERDA (x < -0.9): bate de PERNA DIREITA no canto DIREITO (+X) -> abre por fora da trave direita e curva pra dentro (-X, spinY > 0)!
        // • Na DIREITA (x > +0.9): bate de PERNA ESQUERDA no canto ESQUERDO (-X) -> abre por fora da trave esquerda e curva pra dentro (+X, spinY < 0)!
        let targetCornerSign: -1 | 1; // +1 = canto direito (+X); -1 = canto esquerdo (-X)
        if (ball.pos.x < -0.9) {
          targetCornerSign = 1; // Está na esquerda -> bate com a direita cruzado no canto direito!
        } else if (ball.pos.x > 0.9) {
          targetCornerSign = -1; // Está na direita -> bate com a esquerda cruzado no canto esquerdo!
        } else if (input.moveX > 0.22) {
          targetCornerSign = 1;
        } else if (input.moveX < -0.22) {
          targetCornerSign = -1;
        } else {
          targetCornerSign = player.preferredFoot === 'ESQUERDA' ? -1 : 1;
        }

        // Canto direito (+1) usa Perna Direita (false); Canto esquerdo (-1) usa Perna Esquerda (true)!
        pState.lastKickUsedLeftFoot = targetCornerSign === -1;

        const farPenalty = distFromGoalLine > 29 ? (distFromGoalLine - 29) * 0.14 : 0;
        const dispersion = (1 - finSkill) * 0.8 + farPenalty;
        const targetX =
          targetCornerSign * (3.35 + finSkill * 0.72) + (Math.random() - 0.5) * dispersion;

        const overLift = power > 0.9 ? (power - 0.9) * 11.0 : 0;
        const targetY = 0.68 + power * 1.98 + overLift;

        const horizSpd = (25.5 + (attrs.shotPower / 99) * 9.5) * (0.7 + power * 0.34);
        const distanceSpinScale = Math.max(0.65, Math.min(1.08, 22 / distFromGoalLine));

        // Em Three.js (vz < 0):
        // • spinY > 0 gera força Magnus em -X (abre por fora na direita +X e curva pra dentro -X!)
        // • spinY < 0 gera força Magnus em +X (abre por fora na esquerda -X e curva pra dentro +X!)
        const spinY = targetCornerSign * (18.5 + finSkill * 5.5) * distanceSpinScale;
        const spinX = -2.0;

        const solvedVel = solveTenseShotVelocity(
          ball.pos,
          targetX,
          targetY,
          horizSpd,
          spinX,
          spinY,
        );
        ball.vel.copy(solvedVel);
        ball.spin.set(spinX, spinY, 0);
        pState.facingYaw = Math.atan2(solvedVel.x, solvedVel.z);
        kicked = 'FINESSE_SHOT';
        playBallKickSfx(0.58 + power * 0.36);
      } else {
        // CHUTE FORTE INTELIGENTE (B): crava na melhor posição aberta longe do goleiro!
        pState.lastKickUsedLeftFoot = player.preferredFoot === 'ESQUERDA';
        const dispersion =
          (1 - finSkill) * 1.2 + (distFromGoalLine > 25 ? (distFromGoalLine - 25) * 0.06 : 0);
        const targetX =
          bestSide * (2.85 + finSkill * 0.95) + (Math.random() - 0.5) * dispersion;

        const overPowerLift =
          power > 0.9 ? (power - 0.9) * 13.0 * (1.25 - finSkill * 0.6) : 0;
        const targetY = 0.42 + power * 2.15 + overPowerLift;

        const maxShotSpd = 26.5 + (attrs.shotPower / 99) * 14.0;
        const horizSpd = maxShotSpd * (0.64 + power * 0.38);
        const spinX = -3.4;
        const spinY = (Math.random() - 0.5) * 1.8;

        const solvedVel = solveTenseShotVelocity(
          ball.pos,
          targetX,
          targetY,
          horizSpd,
          spinX,
          spinY,
        );
        ball.vel.copy(solvedVel);
        ball.spin.set(spinX, spinY, 0);
        pState.facingYaw = Math.atan2(solvedVel.x, solvedVel.z);
        kicked = 'POWER_SHOT';
        playBallKickSfx(0.62 + power * 0.38);
      }
    } else if (intent === 'PASS') {
      pState.lastKickUsedLeftFoot = player.preferredFoot === 'ESQUERDA';
      const toMate = new THREE.Vector3(
        teammatePos.x + teammateVel.x * 0.25 - ball.pos.x,
        0,
        teammatePos.z + teammateVel.z * 0.25 - ball.pos.z,
      );
      const mateDist = toMate.length();
      const mateDir = mateDist > 0.4 ? toMate.clone().normalize() : baseAim.clone();

      const align = baseAim.dot(mateDir);
      const dir =
        align > 0.48
          ? baseAim.clone().lerp(mateDir, 0.84).normalize()
          : align > 0.12 && wishMag < 0.22
            ? mateDir
            : baseAim.clone();

      const spd = 12.5 + power * (14.5 + (attrs.shortPass / 99) * 4.0);
      ball.vel.set(dir.x * spd, 0.18 + power * 0.35, dir.z * spd);
      ball.spin.set(0, 0, 0);
      pState.facingYaw = Math.atan2(dir.x, dir.z);
      kicked = 'GROUND_PASS';
      playBallKickSfx(0.42 + power * 0.35);
    } else if (intent === 'THROUGH') {
      pState.lastKickUsedLeftFoot = player.preferredFoot === 'ESQUERDA';
      const leadDepth = 5.5 + power * 8.5;
      const idealTx = Math.max(
        -PITCH.HALF_W + 3.5,
        Math.min(PITCH.HALF_W - 3.5, teammatePos.x * 0.68 + teammateVel.x * 0.35),
      );
      const idealTz = Math.max(
        -PITCH.HALF_L + 5.2,
        Math.min(12, Math.min(teammatePos.z, ball.pos.z + 2) - leadDepth),
      );

      throughBallTarget = new THREE.Vector3(idealTx, 0, idealTz);
      const dx = idealTx - ball.pos.x;
      const dz = idealTz - ball.pos.z;
      const passDist = Math.max(2.0, Math.hypot(dx, dz));
      const dirX = dx / passDist;
      const dirZ = dz / passDist;

      const mateDist = Math.hypot(idealTx - teammatePos.x, idealTz - teammatePos.z);
      const tArrival = Math.max(0.55, Math.min(2.1, mateDist / 8.8));
      const solvedSpd = Math.min(
        26.5,
        Math.max(12.5, passDist / tArrival + 0.5 * BALL_AERO.GRASS_FRICTION * tArrival),
      );

      ball.vel.set(dirX * solvedSpd, 0.22, dirZ * solvedSpd);
      ball.spin.set(3.2, 0, 0);
      pState.facingYaw = Math.atan2(dirX, dirZ);
      kicked = 'THROUGH_BALL';
      playBallKickSfx(0.5 + power * 0.35);
    } else if (intent === 'CROSS') {
      pState.lastKickUsedLeftFoot = player.preferredFoot === 'ESQUERDA';
      const desiredRange = 10.5 + power * (26.0 + (attrs.longPass / 99) * 6.0);
      let dir = baseAim.clone();

      const mateBoxSpot = new THREE.Vector3(
        teammatePos.x + teammateVel.x * 0.55,
        0,
        Math.max(-PITCH.HALF_L + 6.0, Math.min(teammatePos.z - 2.5, -29)),
      );
      const toBoxMate = mateBoxSpot.clone().sub(new THREE.Vector3(ball.pos.x, 0, ball.pos.z));
      if (toBoxMate.length() > 3) {
        const mateSpotDir = toBoxMate.clone().normalize();
        const onWing = Math.abs(ball.pos.x) > 9.5 && ball.pos.z < -12;
        if (baseAim.dot(mateSpotDir) > 0.5 || (onWing && wishMag < 0.22)) {
          dir = dir.lerp(mateSpotDir, 0.78).normalize();
        }
      }

      const horizSpd = 14.0 + power * (16.5 + (attrs.longPass / 99) * 4.0);
      const flightTime = Math.min(1.85, Math.max(0.55, desiredRange / horizSpd));
      const loftY = Math.min(
        13.2,
        Math.max(5.6, 0.5 * Math.abs(BALL_AERO.GRAVITY) * flightTime * 0.88),
      );

      const inwardSpinY = ball.pos.x > 3 ? 9.5 : ball.pos.x < -3 ? -9.5 : 0;
      ball.vel.set(dir.x * horizSpd, loftY, dir.z * horizSpd);
      ball.spin.set(-4.5, inwardSpinY, 0);
      pState.facingYaw = Math.atan2(dir.x, dir.z);
      kicked = 'LOB_CROSS';
      playBallKickSfx(0.52 + power * 0.42);
    }

    pState.kickAnimTimer = 0.28;
  };

  if (pState.windupTimer > 0) {
    if (!canStrike) {
      pState.windupTimer = 0;
      pState.lockedIntent = null;
    } else {
      pState.windupTimer -= dt;
      if (pState.windupTimer <= 0 && pState.lockedIntent) {
        const intent = pState.lockedIntent;
        const pwr = pState.lockedPower01;
        const fin = pState.chargingFinesse || input.finesseHeld;
        const chp = pState.chargingChip || input.chipHeld;
        pState.lockedIntent = null;
        pState.chargingFinesse = false;
        pState.chargingChip = false;
        executeStrike(intent, pwr, fin, chp);
      }
    }
    return { kicked, calledForBall, commandedMateShoot, triggeredFakeShotDirX, throughBallTarget };
  }

  if (canStrike && !pState.suppressButtonsUntilRelease) {
    if (pState.chargeIntent === null) {
      if (input.shootHeld) {
        pState.chargeIntent = 'SHOT';
        pState.powerCharge01 = 0.08;
        pState.chargingFinesse = input.finesseHeld;
        pState.chargingChip = input.chipHeld;
      } else if (input.passHeld) {
        pState.chargeIntent = 'PASS';
        pState.powerCharge01 = 0.1;
      } else if (input.throughHeld) {
        pState.chargeIntent = 'THROUGH';
        pState.powerCharge01 = 0.1;
      } else if (input.lobHeld) {
        pState.chargeIntent = 'CROSS';
        pState.powerCharge01 = 0.1;
      }
    }

    if (pState.chargeIntent !== null) {
      const chargeSpeed = pState.chargeIntent === 'SHOT' ? 1.55 : 1.75;
      pState.powerCharge01 = Math.min(1, pState.powerCharge01 + dt * chargeSpeed);
      if (pState.chargeIntent === 'SHOT') {
        if (input.finesseHeld) pState.chargingFinesse = true;
        if (input.chipHeld) pState.chargingChip = true;
      }
      pState.hudPower01 = pState.powerCharge01;
      pState.hudPowerHoldTimer = 0.38;

      const stillHeld =
        (pState.chargeIntent === 'SHOT' && input.shootHeld) ||
        (pState.chargeIntent === 'PASS' && input.passHeld) ||
        (pState.chargeIntent === 'THROUGH' && input.throughHeld) ||
        (pState.chargeIntent === 'CROSS' && input.lobHeld);

      if (!stillHeld || pState.powerCharge01 >= 0.995) {
        const intent = pState.chargeIntent;
        const power = Math.max(0.16, pState.powerCharge01);
        pState.chargeIntent = null;
        pState.powerCharge01 = 0;
        pState.hudPower01 = power;
        pState.hudPowerHoldTimer = 0.38;

        if (intent === 'SHOT' || intent === 'CROSS') {
          pState.windupTimer = 0.135;
          pState.lockedPower01 = power;
          pState.lockedIntent = intent;
        } else {
          const fin = pState.chargingFinesse;
          const chp = pState.chargingChip;
          pState.chargingFinesse = false;
          pState.chargingChip = false;
          executeStrike(intent, power, fin, chp);
        }
      }
    }
  } else if (!canStrike) {
    // SEM A BOLA: A pede passe no pé na hora, Y pede bola enfiada, X pede cruzamento (ou dá carrinho)!
    pState.chargeIntent = null;
    pState.powerCharge01 = 0;
    pState.chargingFinesse = false;
    pState.chargingChip = false;

    if (ball.ownerId === 'MATE' && input.shootJustPressed) {
      commandedMateShoot = true;
    } else if (input.passJustPressed) {
      calledForBall = 'PASS';
    } else if (input.throughJustPressed) {
      calledForBall = 'THROUGH';
    } else if (input.lobOrSlideJustPressed) {
      if (ball.ownerId === 'MATE') {
        calledForBall = 'CROSS';
      } else if (pState.slideTimer <= 0 && horizSpeed > 2.4 && distToBall < 3.5) {
        pState.slideTimer = 0.42;
        pState.vel.multiplyScalar(1.32);
        if (distToBall < 1.9) {
          const lungeDir = new THREE.Vector3(Math.sin(pState.facingYaw), 0, Math.cos(pState.facingYaw));
          ball.ownerId = null;
          ball.lastTouchBy = 'USER';
          ball.touchCooldown = 0.22;
          ball.vel.set(lungeDir.x * 12.5, 1.0, lungeDir.z * 12.5);
          playBallKickSfx(0.5);
        }
      } else {
        calledForBall = 'CROSS';
      }
    }
  }

  return { kicked, calledForBall, commandedMateShoot, triggeredFakeShotDirX, throughBallTarget };
}
