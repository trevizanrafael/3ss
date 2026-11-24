import * as THREE from 'three';
import { CareerPlayer } from '../../domains/player/playerTypes';
import { playBallKickSfx } from '../audio/matchAudio';
import { LivePitchInput } from '../input/usePitchInput';
import { KickKind } from '../types';
import { BALL_AERO, BallState } from './ballPhysics';
import { PITCH } from './pitchConstants';

type ChargeIntent = 'SHOT' | 'CHIP' | 'PASS' | 'THROUGH' | 'CROSS' | null;

export interface PlayerPitchState {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  facingYaw: number;
  stamina: number; // Fôlego curto atual (0..maxStamina)
  maxStamina: number; // Teto pré-jogo (ex: 75% ou 100%)
  powerCharge01: number;
  chargeIntent: ChargeIntent;
  chargingFinesse: boolean;
  chargingChip: boolean;
  suppressButtonsUntilRelease: boolean; // Evita passe/chute acidental logo após Fingir Chute (B+A)!
  fakeShotCutTimer: number;
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
    suppressButtonsUntilRelease: false,
    fakeShotCutTimer: 0,
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

export function stepPlayerAndBallControl(
  pState: PlayerPitchState,
  player: CareerPlayer,
  ball: BallState,
  input: LivePitchInput,
  camYaw: number,
  teammatePos: THREE.Vector3,
  teammateVel: THREE.Vector3,
  dt: number,
): {
  kicked: KickKind | null;
  calledForBall: 'PASS' | 'THROUGH' | 'CROSS' | null;
  commandedMateShoot: boolean;
  triggeredFakeShotDirX: number | null;
} {
  const attrs = player.attributes;
  pState.kickAnimTimer = Math.max(0, pState.kickAnimTimer - dt);
  pState.slideTimer = Math.max(0, pState.slideTimer - dt);
  pState.fakeShotCutTimer = Math.max(0, pState.fakeShotCutTimer - dt);

  if (
    pState.suppressButtonsUntilRelease &&
    !input.shootHeld &&
    !input.passHeld &&
    !input.lobHeld &&
    !input.chipHeld
  ) {
    pState.suppressButtonsUntilRelease = false;
  }

  if (pState.hudPowerHoldTimer > 0) {
    pState.hudPowerHoldTimer = Math.max(0, pState.hudPowerHoldTimer - dt);
    if (pState.hudPowerHoldTimer <= 0 && pState.chargeIntent === null) {
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

  if (ball.ownerId === 'USER' && pState.fakeShotCutTimer <= 0) {
    const dribbleEfficiency = 0.87 + (attrs.dribbling / 99) * 0.11;
    targetSpeed *= dribbleEfficiency;
  }

  if (pState.slideTimer > 0) {
    pState.vel.multiplyScalar(Math.max(0, 1 - 3.2 * dt));
  } else if (pState.fakeShotCutTimer > 0) {
    // Mantém a explosão curta do corte (Fake Shot)
    pState.vel.multiplyScalar(Math.max(0, 1 - 1.6 * dt));
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
    const turnRate = pState.fakeShotCutTimer > 0 ? 26 : 11.5 + (attrs.agility / 99) * 7;
    pState.facingYaw += shortestAngleDiff(pState.facingYaw, desiredYaw) * Math.min(1, turnRate * dt);
  }

  // 2. Domínio / Condução Natural da Bola no Pé
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
      pState.fakeShotCutTimer > 0
        ? 0.56
        : input.closeControlHeld
          ? 0.5
          : canSprint
            ? 0.76
            : 0.6;
    const sinY = Math.sin(pState.facingYaw);
    const cosY = Math.cos(pState.facingYaw);

    const targetBx = pState.pos.x + sinY * leadDist + cosY * footSide;
    const targetBz = pState.pos.z + cosY * leadDist - sinY * footSide;

    const snapRate = pState.fakeShotCutTimer > 0 ? 34 : 22;
    ball.pos.x += (targetBx - ball.pos.x) * Math.min(1, snapRate * dt);
    ball.pos.z += (targetBz - ball.pos.z) * Math.min(1, snapRate * dt);
    ball.pos.y = PITCH.BALL_RADIUS;
    ball.vel.copy(pState.vel);
  }

  // 3. Ações com Bola: Chute, Colocado, Cavadinha (LB), Fingir Chute (B->A / X->A), Passe, Enfiada e Cruzamento!
  let kicked: KickKind | null = null;
  let calledForBall: 'PASS' | 'THROUGH' | 'CROSS' | null = null;
  let commandedMateShoot = false;
  let triggeredFakeShotDirX: number | null = null;

  const canStrike =
    ball.ownerId === 'USER' ||
    (ball.ownerId === null && distToBall < 1.48 && ball.pos.y < 1.85);

  if (canStrike && !pState.suppressButtonsUntilRelease) {
    if (pState.chargeIntent === null) {
      if (input.shootHeld) {
        pState.chargeIntent = input.chipHeld ? 'CHIP' : 'SHOT';
        pState.powerCharge01 = 0.08;
        pState.chargingFinesse = input.finesseHeld;
        pState.chargingChip = input.chipHeld;
      } else if (input.chipHeld) {
        // Suporta apertar/segurar LB direto (ou LB+B) para Cavadinha!
        pState.chargeIntent = 'CHIP';
        pState.powerCharge01 = 0.08;
        pState.chargingChip = true;
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

    // FINGIR CHUTE / CORTE SECO ESTILO FIFA (Apertar A enquanto carrega Chute B, Cruzamento X ou Cavadinha LB)!
    if (
      (pState.chargeIntent === 'SHOT' ||
        pState.chargeIntent === 'CROSS' ||
        pState.chargeIntent === 'CHIP') &&
      input.passJustPressed
    ) {
      const fakedDirX = pState.pos.x >= 0 ? -1 : 1;
      pState.chargeIntent = null;
      pState.powerCharge01 = 0;
      pState.chargingFinesse = false;
      pState.chargingChip = false;
      pState.hudPower01 = 0;
      pState.hudPowerHoldTimer = 0;
      pState.suppressButtonsUntilRelease = true;

      // Direção da ajeitada: para onde o analógico aponta, ou corte lateral de 55° pro pé dominante!
      const cutDir = new THREE.Vector3();
      if (wishMag > 0.16) {
        cutDir.copy(tmpWish);
      } else {
        const sideSign = player.preferredFoot === 'ESQUERDA' ? -1 : 1;
        const cutYaw = pState.facingYaw + sideSign * 0.95;
        cutDir.set(Math.sin(cutYaw), 0, Math.cos(cutYaw)).normalize();
      }

      const burstSpd = 7.9 + (attrs.dribbling / 99) * 2.5 + (attrs.agility / 99) * 1.1;
      pState.vel.set(cutDir.x * burstSpd, 0, cutDir.z * burstSpd);
      pState.facingYaw = Math.atan2(cutDir.x, cutDir.z);
      pState.fakeShotCutTimer = 0.28;
      ball.ownerId = 'USER';
      ball.lastTouchBy = 'USER';
      playBallKickSfx(0.28);
      triggeredFakeShotDirX = fakedDirX;

      return { kicked: null, calledForBall: null, commandedMateShoot: false, triggeredFakeShotDirX };
    }

    if (pState.chargeIntent !== null) {
      const chargeSpeed = pState.chargeIntent === 'SHOT' || pState.chargeIntent === 'CHIP' ? 1.55 : 1.75;
      pState.powerCharge01 = Math.min(1, pState.powerCharge01 + dt * chargeSpeed);
      if (pState.chargeIntent === 'SHOT' && input.finesseHeld) {
        pState.chargingFinesse = true;
      }
      if (pState.chargeIntent === 'SHOT' && input.chipHeld) {
        pState.chargeIntent = 'CHIP';
        pState.chargingChip = true;
      }
      pState.hudPower01 = pState.powerCharge01;
      pState.hudPowerHoldTimer = 0.38;

      const stillHeld =
        (pState.chargeIntent === 'SHOT' && input.shootHeld) ||
        (pState.chargeIntent === 'CHIP' && (input.shootHeld || input.chipHeld)) ||
        (pState.chargeIntent === 'PASS' && input.passHeld) ||
        (pState.chargeIntent === 'THROUGH' && input.throughHeld) ||
        (pState.chargeIntent === 'CROSS' && input.lobHeld);

      if (!stillHeld || pState.powerCharge01 >= 0.995) {
        const intent = pState.chargeIntent;
        const power = Math.max(0.16, pState.powerCharge01);
        const isFinesse = pState.chargingFinesse || input.finesseHeld;

        pState.chargeIntent = null;
        pState.powerCharge01 = 0;
        pState.chargingFinesse = false;
        pState.chargingChip = false;
        pState.hudPower01 = power;
        pState.hudPowerHoldTimer = 0.38;

        const baseAim = wishMag > 0.18 ? tmpWish.clone() : tmpForward.clone();

        ball.ownerId = null;
        ball.lastTouchBy = 'USER';
        ball.touchCooldown = 0.24;

        if (intent === 'CHIP') {
          // CAVADINHA ESTILO FIFA (LB / LB+B): arco curto c/ backspin pesado p/ encobrir goleiro adiantado!
          const aimDir = baseAim.clone();
          const toGoalCenter = new THREE.Vector3(
            0 - ball.pos.x,
            0,
            -PITCH.HALF_L - ball.pos.z,
          ).normalize();
          if (aimDir.dot(toGoalCenter) > 0.35) {
            const projX =
              aimDir.z < -0.2
                ? ball.pos.x + (aimDir.x / aimDir.z) * (-PITCH.HALF_L - ball.pos.z)
                : 0;
            const clampedX = Math.max(-3.1, Math.min(3.1, projX * 0.72));
            const smartDir = new THREE.Vector3(
              clampedX - ball.pos.x,
              0,
              -PITCH.HALF_L - ball.pos.z,
            ).normalize();
            aimDir.lerp(smartDir, 0.55).normalize();
          }

          const distToGoal = Math.max(6, Math.hypot(ball.pos.x, -PITCH.HALF_L - ball.pos.z));
          const horizSpd = Math.min(20.5, Math.max(9.5, distToGoal * (0.58 + power * 0.52)));
          // Força ideal 30%..68% cobre o goleiro e cai antes do travessão; >82% passa por cima!
          const loftY = 7.8 + power * 5.8 + (power > 0.8 ? (power - 0.8) * 7.5 : 0);

          ball.vel.set(aimDir.x * horizSpd, loftY, aimDir.z * horizSpd);
          ball.spin.set(9.5, 0, 0); // Backspin forte faz a bola cair macia atrás do goleiro!
          pState.facingYaw = Math.atan2(aimDir.x, aimDir.z);
          kicked = 'CHIP_SHOT';
          playBallKickSfx(0.42 + power * 0.28);
        } else if (intent === 'SHOT') {
          if (isFinesse) {
            // CHUTE COLOCADO ESTILO FIFA (RB + B): batida tensa, baixa/média (SEM cobertura!) e MUITA CURVA LATERAL!
            const aimDir = baseAim.clone();
            const toGoalCenter = new THREE.Vector3(
              0 - ball.pos.x,
              0,
              -PITCH.HALF_L - ball.pos.z,
            ).normalize();

            // Decide para qual lado a chapa do pé vai curvar a bola
            const projX =
              aimDir.z < -0.2
                ? ball.pos.x + (aimDir.x / aimDir.z) * (-PITCH.HALF_L - ball.pos.z)
                : 0;

            let curlSign: -1 | 1; // +1 = curva da direita p/ esquerda (-X); -1 = curva da esquerda p/ direita (+X)
            if (projX < -0.8) curlSign = 1;
            else if (projX > 0.8) curlSign = -1;
            else if (ball.pos.x > 1.8) curlSign = 1;
            else if (ball.pos.x < -1.8) curlSign = -1;
            else curlSign = player.preferredFoot === 'ESQUERDA' ? -1 : 1;

            // Leve assistência na direção que você mirou (exige ângulo e mira real, não é teleguiado!)
            if (aimDir.dot(toGoalCenter) > 0.35) {
              const targetAimX = Math.max(-3.6, Math.min(3.6, projX * 0.82));
              const userCornerDir = new THREE.Vector3(
                targetAimX - ball.pos.x,
                0,
                -PITCH.HALF_L - ball.pos.z,
              ).normalize();
              aimDir.lerp(userCornerDir, 0.45 + (attrs.finishing / 99) * 0.18).normalize();
            }

            const maxFinesseSpd = 23.0 + (attrs.shotPower / 99) * 10.5;
            const speed = maxFinesseSpd * (0.58 + power * 0.44);
            const distGoal = Math.min(30, Math.max(7, Math.abs(-PITCH.HALF_L - ball.pos.z)));
            const tEst = distGoal / speed;

            // Efeito lateral forte estilo FIFA (curva nítida no ar!)
            const spinY = curlSign * (20.0 + (attrs.finishing / 99) * 7.5);
            // Compensa parcialmente na saída (+X quando curva p/ -X) para desenhar o arco por fora!
            const lateralAccel = Math.abs(spinY) * speed * BALL_AERO.MAGNUS_COEFF * 0.72;
            const bowOutVx = curlSign * 0.5 * lateralAccel * tEst * 0.88;

            // Altura tensa de chapa (NUNCA balão de cobertura; se encher >88% isola!)
            const overLift = power > 0.88 ? (power - 0.88) * 18 : 0;
            const loftY = 2.4 + power * 5.6 + overLift;

            ball.vel.set(aimDir.x * speed + bowOutVx, loftY, aimDir.z * speed);
            ball.spin.set(-4.2, spinY, 0); // Topspin leve + muita curva lateral!
            pState.facingYaw = Math.atan2(ball.vel.x, ball.vel.z);
            kicked = 'FINESSE_SHOT';
            playBallKickSfx(0.58 + power * 0.38);
          } else {
            // BOMBA DE PEITO DE PÉ (B): pesada, rápida e seca!
            const aimDir = baseAim.clone();
            const toGoalCenter = new THREE.Vector3(
              0 - ball.pos.x,
              0,
              -PITCH.HALF_L - ball.pos.z,
            ).normalize();
            if (aimDir.dot(toGoalCenter) > 0.35) {
              const projX =
                aimDir.z < -0.2
                  ? ball.pos.x + (aimDir.x / aimDir.z) * (-PITCH.HALF_L - ball.pos.z)
                  : 0;
              const clampedGoalX = Math.max(-3.4, Math.min(3.4, projX * 0.8));
              const smartGoalDir = new THREE.Vector3(
                clampedGoalX - ball.pos.x,
                0,
                -PITCH.HALF_L - ball.pos.z,
              ).normalize();
              aimDir.lerp(smartGoalDir, 0.4 + (attrs.finishing / 99) * 0.2).normalize();
            }

            const maxShotSpeed = 24.5 + (attrs.shotPower / 99) * 14.0;
            const speed = maxShotSpeed * (0.54 + power * 0.5);
            const overPowerPenalty =
              power > 0.89 ? (power - 0.89) * 11 * (1.2 - (attrs.finishing / 99) * 0.65) : 0;
            const loftY = 1.8 + power * 6.8 + overPowerPenalty * 6.5;

            ball.vel.set(aimDir.x * speed, loftY, aimDir.z * speed);
            ball.spin.set(-6.0, (Math.random() - 0.5) * 2.5, 0);
            pState.facingYaw = Math.atan2(aimDir.x, aimDir.z);
            kicked = 'POWER_SHOT';
            playBallKickSfx(0.6 + power * 0.4);
          }
        } else if (intent === 'PASS') {
          const toMate = new THREE.Vector3(
            teammatePos.x + teammateVel.x * 0.25 - ball.pos.x,
            0,
            teammatePos.z + teammateVel.z * 0.25 - ball.pos.z,
          );
          const mateDist = toMate.length();
          const mateDir = mateDist > 0.4 ? toMate.clone().normalize() : baseAim.clone();

          const align = baseAim.dot(mateDir);
          const dir =
            align > 0.6
              ? baseAim.clone().lerp(mateDir, 0.78).normalize()
              : align > 0.2 && wishMag < 0.2
                ? mateDir
                : baseAim.clone();

          const spd = 12.5 + power * (14.5 + (attrs.shortPass / 99) * 4.0);
          ball.vel.set(dir.x * spd, 0.2 + power * 0.4, dir.z * spd);
          ball.spin.set(0, 0, 0);
          pState.facingYaw = Math.atan2(dir.x, dir.z);
          kicked = 'GROUND_PASS';
          playBallKickSfx(0.4 + power * 0.35);
        } else if (intent === 'THROUGH') {
          const leadAhead = 4.2 + power * 9.5;
          const mateRunTarget = new THREE.Vector3(
            teammatePos.x + teammateVel.x * 0.4,
            0,
            Math.max(-PITCH.HALF_L + 4.5, teammatePos.z - leadAhead),
          );
          const toLead = mateRunTarget.clone().sub(new THREE.Vector3(ball.pos.x, 0, ball.pos.z));
          const leadDir = toLead.length() > 0.5 ? toLead.normalize() : baseAim.clone();

          const dir =
            baseAim.dot(leadDir) > 0.42
              ? baseAim.clone().lerp(leadDir, 0.82).normalize()
              : baseAim.clone();

          const spd = 14.0 + power * (14.5 + (attrs.shortPass / 99) * 4.5);
          ball.vel.set(dir.x * spd, 0.3 + power * 0.5, dir.z * spd);
          ball.spin.set(4.0, 0, 0);
          pState.facingYaw = Math.atan2(dir.x, dir.z);
          kicked = 'THROUGH_BALL';
          playBallKickSfx(0.48 + power * 0.38);
        } else if (intent === 'CROSS') {
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
            if (baseAim.dot(mateSpotDir) > 0.52 || (onWing && wishMag < 0.22)) {
              dir = dir.lerp(mateSpotDir, 0.76).normalize();
            }
          }

          const horizSpd = 13.5 + power * (16.5 + (attrs.longPass / 99) * 4.0);
          const flightTime = Math.min(1.85, Math.max(0.55, desiredRange / horizSpd));
          const loftY = Math.min(13.5, Math.max(5.8, 0.5 * Math.abs(BALL_AERO.GRAVITY) * flightTime * 0.86));

          const inwardSpinY = ball.pos.x > 3 ? 9.5 : ball.pos.x < -3 ? -9.5 : 0;
          ball.vel.set(dir.x * horizSpd, loftY, dir.z * horizSpd);
          ball.spin.set(-5.0, inwardSpinY, 0);
          pState.facingYaw = Math.atan2(dir.x, dir.z);
          kicked = 'LOB_CROSS';
          playBallKickSfx(0.52 + power * 0.42);
        }

        pState.kickAnimTimer = 0.28;
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

  return { kicked, calledForBall, commandedMateShoot, triggeredFakeShotDirX };
}
