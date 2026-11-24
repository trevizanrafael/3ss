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
  /** Janela curta de alavanca da perna (~135ms) ao soltar B/X para permitir apertar B e depois A (Fingir Chute)! */
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
 * Resolve o vetor inicial exato (vx, vy, vz) com a física real do jogo para que o chute suba firme
 * até (targetX, targetY, -HALF_L) sem pingar antes e desenhando um arco único de fora para dentro!
 */
function solveBallisticShotToGoal(
  startPos: THREE.Vector3,
  targetX: number,
  targetY: number,
  horizSpeed: number,
  spinX: number,
  spinY: number,
): THREE.Vector3 {
  const goalZ = -PITCH.HALF_L;
  const distZ = Math.max(3.5, Math.abs(goalZ - startPos.z));
  const estT = distZ / Math.max(14, horizSpeed * 0.94);

  let vx = (targetX - startPos.x) / estT;
  const maxVx = horizSpeed * 0.72;
  vx = Math.max(-maxVx, Math.min(maxVx, vx));
  const vz = -Math.sqrt(Math.max(120, horizSpeed * horizSpeed - vx * vx));
  let vy = (targetY - startPos.y - 0.5 * BALL_AERO.GRAVITY * estT * estT) / estT;

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

    for (let step = 0; step < 180 && pz > goalZ; step++) {
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
      vy += ((targetY - py) / elapsed) * 0.92;
    }
  }

  return new THREE.Vector3(vx, Math.max(0.8, vy), vz);
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

  // 1. Vetores relativos à câmera
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
    // Na fase 1 (0.34 -> 0.22) freia ameaçando o chute; na fase 2 (0.22 -> 0) explode na penteada!
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

  // 2. Domínio / Condução Natural da Bola no Pé
  const distToBall = Math.hypot(ball.pos.x - pState.pos.x, ball.pos.z - pState.pos.z);
  const controlRadius = 0.94 + (attrs.ballControl / 99) * 0.34;

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
        ? 0.54
        : input.closeControlHeld
          ? 0.5
          : canSprint
            ? 0.76
            : 0.6;
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

  // 3. Sistema de Chute Inteligente, LB+B Cavadinha, RB+B Chapada, B->A Fingir Chute e Y Enfiada Inteligente!
  let kicked: KickKind | null = null;
  let calledForBall: 'PASS' | 'THROUGH' | 'CROSS' | null = null;
  let commandedMateShoot = false;
  let triggeredFakeShotDirX: number | null = null;
  let throughBallTarget: THREE.Vector3 | null = null;

  const canStrike =
    ball.ownerId === 'USER' ||
    (ball.ownerId === null && distToBall < 1.5 && ball.pos.y < 1.85);

  // FINGIR CHUTE (B depois A, ou X depois A): funciona TANTO segurando B+A QUANTO soltando B e apertando A logo em seguida!
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

    // Penteada pro lado apontado no analógico (ou corte lateral de 60° se o analógico estiver neutro!)
    const cutDir = new THREE.Vector3();
    if (wishMag > 0.16) {
      cutDir.copy(tmpWish);
    } else {
      const sideSign = player.preferredFoot === 'ESQUERDA' ? -1 : 1;
      const cutYaw = pState.facingYaw + sideSign * 1.02;
      cutDir.set(Math.sin(cutYaw), 0, Math.cos(cutYaw)).normalize();
    }

    const burstSpd = 8.1 + (attrs.dribbling / 99) * 2.5 + (attrs.agility / 99) * 1.1;
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

    ball.ownerId = null;
    ball.lastTouchBy = 'USER';
    ball.touchCooldown = 0.24;

    if (intent === 'SHOT') {
      // Escolha inteligente de canto (analógico Esq/Dir OU canto livre longe do goleiro!)
      let chosenCornerSign: -1 | 1;
      if (input.moveX < -0.24) {
        chosenCornerSign = -1;
      } else if (input.moveX > 0.24) {
        chosenCornerSign = 1;
      } else if (Math.abs(gkPos.x) > 0.22) {
        chosenCornerSign = gkPos.x > 0 ? -1 : 1;
      } else {
        chosenCornerSign = ball.pos.x >= 0 ? -1 : 1;
      }

      if (isChip) {
        // CAVADINHA (LB + B): encobre o goleiro quando ele sai/ajoelha no 1x1 e cai dentro do gol!
        pState.lastKickUsedLeftFoot = player.preferredFoot === 'ESQUERDA';
        const errorX = (Math.random() - 0.5) * (1 - finSkill) * 1.1;
        const targetX = chosenCornerSign * (1.55 + finSkill * 0.85) + errorX;
        const dx = targetX - ball.pos.x;
        const dz = -PITCH.HALF_L + 0.8 - ball.pos.z;
        const distToGoal = Math.max(4.0, Math.hypot(dx, dz));

        // Calibrado p/ subir a ~1.95..2.25m por cima do goleiro ajoelhado e cair ABAIXO do travessão (2.44m)!
        // Se encher >82% da barra, encobre demais e cai em cima da rede superior!
        const overChip = power > 0.8 ? (power - 0.8) * 3.8 : 0;
        const landY = Math.min(3.1, 0.35 + power * 1.55 + overChip);
        const flightT = Math.min(1.35, Math.max(0.68, distToGoal / (10.5 + power * 5.2)));
        const vx = dx / flightT;
        const vz = dz / flightT;
        const vy =
          (landY - ball.pos.y - 0.5 * (BALL_AERO.GRAVITY + 1.2) * flightT * flightT) / flightT;

        ball.vel.set(vx, Math.max(5.8, vy), vz);
        ball.spin.set(7.5, 0, 0); // Backspin suave faz pingar macio dentro do gol!
        pState.facingYaw = Math.atan2(vx, vz);
        kicked = 'CHIP_SHOT';
        playBallKickSfx(0.42 + power * 0.25);
      } else if (isFinesse) {
        // CHUTE COLOCADO CHAPADO (RB + B):
        // Na direita (x > 1) bate de PERNA ESQUERDA curvando de fora (+X) pra dentro (-X)!
        // Na esquerda (x < -1) bate de PERNA DIREITA curvando de fora (-X) pra dentro (+X)!
        let curlInwardSign: -1 | 1; // +1 = curva p/ esquerda (-X); -1 = curva p/ direita (+X)
        if (ball.pos.x > 1.1) {
          curlInwardSign = 1; // Está na direita -> bate de canhota curvando p/ esquerda!
          pState.lastKickUsedLeftFoot = true;
        } else if (ball.pos.x < -1.1) {
          curlInwardSign = -1; // Está na esquerda -> bate de direita curvando p/ direita!
          pState.lastKickUsedLeftFoot = false;
        } else if (input.moveX < -0.22) {
          curlInwardSign = 1;
          pState.lastKickUsedLeftFoot = true;
        } else if (input.moveX > 0.22) {
          curlInwardSign = -1;
          pState.lastKickUsedLeftFoot = false;
        } else {
          const leftPref = player.preferredFoot === 'ESQUERDA';
          curlInwardSign = leftPref ? 1 : -1;
          pState.lastKickUsedLeftFoot = leftPref;
        }

        // O canto alvo SEMPRE casa com o arco de fora pra dentro (nunca faz S ou curva pra fora!)
        const cornerSign = curlInwardSign === 1 ? -1 : 1;
        const dispersion = (1 - finSkill) * 0.95;
        const targetX =
          cornerSign * (2.35 + finSkill * 0.55) + (Math.random() - 0.5) * dispersion;
        const overPowerLift = power > 0.89 ? (power - 0.89) * 9.5 : 0;
        const targetY = 0.48 + power * 1.65 + overPowerLift;

        const horizSpd = (23.5 + (attrs.shotPower / 99) * 8.5) * (0.68 + power * 0.34);
        const spinY = curlInwardSign * (21.5 + finSkill * 6.5);
        const spinX = -2.2;

        const solvedVel = solveBallisticShotToGoal(
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
        // CHUTE FORTE INTELIGENTE (B): usa Finalização p/ tirar do goleiro e sobe firme sem pingar!
        pState.lastKickUsedLeftFoot = player.preferredFoot === 'ESQUERDA';
        const idealCornerX = chosenCornerSign * (2.1 + finSkill * 0.82);

        // Projeção bruta pra onde a câmera olha
        const rawCamX =
          baseAim.z < -0.2
            ? Math.max(-5.5, Math.min(5.5, ball.pos.x + (baseAim.x / baseAim.z) * (-PITCH.HALF_L - ball.pos.z)))
            : idealCornerX;

        // Quanto maior a Finalização, mais o craque tira do goleiro e crava no canto!
        const smartAssist = 0.58 + finSkill * 0.36;
        const errorSpread = (1 - finSkill) * 1.25;
        const targetX =
          rawCamX * (1 - smartAssist) +
          idealCornerX * smartAssist +
          (Math.random() - 0.5) * errorSpread;

        const overPowerLift =
          power > 0.9 ? (power - 0.9) * 12.0 * (1.25 - finSkill * 0.6) : 0;
        const targetY = 0.35 + power * 1.82 + overPowerLift;

        const maxShotSpd = 25.5 + (attrs.shotPower / 99) * 13.5;
        const horizSpd = maxShotSpd * (0.62 + power * 0.4);
        const spinX = -3.8;
        const spinY = (Math.random() - 0.5) * 2.0;

        const solvedVel = solveBallisticShotToGoal(
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
        align > 0.52
          ? baseAim.clone().lerp(mateDir, 0.82).normalize()
          : align > 0.15 && wishMag < 0.22
            ? mateDir
            : baseAim.clone();

      const spd = 12.5 + power * (14.5 + (attrs.shortPass / 99) * 4.0);
      ball.vel.set(dir.x * spd, 0.18 + power * 0.35, dir.z * spd);
      ball.spin.set(0, 0, 0);
      pState.facingYaw = Math.atan2(dir.x, dir.z);
      kicked = 'GROUND_PASS';
      playBallKickSfx(0.42 + power * 0.35);
    } else if (intent === 'THROUGH') {
      // BOLA ENFIADA INTELIGENTE (Y): acha sozinho o espaço em profundidade na corrida do parceiro!
      pState.lastKickUsedLeftFoot = player.preferredFoot === 'ESQUERDA';
      const leadDepth = 5.5 + power * 8.5;
      // Puxa suavemente pro corredor de finalização na frente do gol!
      const idealTx = Math.max(
        -PITCH.HALF_W + 3.5,
        Math.min(PITCH.HALF_W - 3.5, teammatePos.x * 0.68 + teammateVel.x * 0.35),
      );
      const idealTz = Math.max(
        -PITCH.HALF_L + 4.8,
        Math.min(12, Math.min(teammatePos.z, ball.pos.z + 2) - leadDepth),
      );

      throughBallTarget = new THREE.Vector3(idealTx, 0, idealTz);
      const dx = idealTx - ball.pos.x;
      const dz = idealTz - ball.pos.z;
      const passDist = Math.max(2.0, Math.hypot(dx, dz));
      const dirX = dx / passDist;
      const dirZ = dz / passDist;

      // Calcula a velocidade exata vencendo o atrito da grama p/ chegar redondinha na passada do camisa 8!
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
        Math.max(-PITCH.HALF_L + 5.5, Math.min(teammatePos.z - 2.5, -29)),
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

  // Se estiver na janela curta de alavanca do chute/cruzamento (windupTimer) e não cancelou com A, bate na bola!
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
      // Nota: Cavadinha exige LB + B (segurar B junto com LB, nunca LB sozinho!)
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
          // Abre a janela natural de 135ms da alavanca do pé (permite soltar B e apertar A p/ Fingir Chute!)
          pState.windupTimer = 0.135;
          pState.lockedPower01 = power;
          pState.lockedIntent = intent;
        } else {
          // Passe (A) e Bola Enfiada (Y) saem instantâneos!
          const fin = pState.chargingFinesse;
          const chp = pState.chargingChip;
          pState.chargingFinesse = false;
          pState.chargingChip = false;
          executeStrike(intent, power, fin, chp);
        }
      }
    }
  } else if (!canStrike) {
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
      } else if (pState.slideTimer <= 0 && horizSpeed > 2.4) {
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
