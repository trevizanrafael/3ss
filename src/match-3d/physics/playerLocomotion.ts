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
  stamina: number; // Fôlego curto atual (0..maxStamina)
  maxStamina: number; // Teto de fôlego com que entrou em campo (ex: 75% ou 100%)
  powerCharge01: number; // 0..1 enquanto segura passe/enfiada/cruzamento/chute
  chargeIntent: ChargeIntent;
  chargingFinesse: boolean;
  hudPower01: number; // Mantém último valor por 0.35s após soltar (leitura estilo FIFA)
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
 * Simula exatamente a trajetória aérea (arrasto + efeito Magnus) até cruzar a linha de gol Norte (z = -HALF_L)
 * para calibrar o ângulo inicial do chute colocado de forma que a curva entre na gaveta!
 */
function solveFinesseShotVelocity(
  startPos: THREE.Vector3,
  targetX: number,
  targetY: number,
  horizSpeed: number,
  spinY: number,
  spinX: number,
): THREE.Vector3 {
  const goalZ = -PITCH.HALF_L;
  const dz = goalZ - startPos.z; // Negativo rumo ao Gol Norte
  const distZ = Math.max(4, Math.abs(dz));
  const estT = distZ / Math.max(12, horizSpeed * 0.92);

  // Chute inicial direto antes da compensação de curva
  let vx = (targetX - startPos.x) / estT;
  let vy = (targetY - startPos.y - 0.5 * BALL_AERO.GRAVITY * estT * estT) / estT;
  const vz = -Math.sqrt(Math.max(100, horizSpeed * horizSpeed - Math.min(horizSpeed * horizSpeed * 0.45, vx * vx)));

  // 2 iterações rápidas de correção balística com a mesma física 240Hz do jogo
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

    for (let step = 0; step < 220 && pz > goalZ; step++) {
      svy += BALL_AERO.GRAVITY * h;
      const drag = 1 - BALL_AERO.AIR_DRAG * h;
      svx *= drag;
      svy *= drag;
      svz *= drag;

      // spin × vel (spinZ = 0)
      const cx = sSpinY * svz;
      const cy = -sSpinX * svz;
      const cz = sSpinX * svy - sSpinY * svx;
      svx += cx * BALL_AERO.MAGNUS_COEFF * h;
      svy += cy * BALL_AERO.MAGNUS_COEFF * h;
      svz += cz * BALL_AERO.MAGNUS_COEFF * h;

      const sDecay = 1 - 0.45 * h;
      sSpinX *= sDecay;
      sSpinY *= sDecay;

      px += svx * h;
      py += svy * h;
      pz += svz * h;
      elapsed += h;
    }

    if (elapsed > 0.05) {
      vx += ((targetX - px) / elapsed) * 0.92;
      vy += ((targetY - py) / elapsed) * 0.88;
    }
  }

  return new THREE.Vector3(vx, Math.max(1.2, vy), vz);
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
} {
  const attrs = player.attributes;
  pState.kickAnimTimer = Math.max(0, pState.kickAnimTimer - dt);
  pState.slideTimer = Math.max(0, pState.slideTimer - dt);

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

  const baseJogSpeed = 5.5 + (attrs.agility / 99) * 1.45;
  const maxSprintSpeed = 7.7 + (attrs.sprintSpeed / 99) * 3.1;
  const canSprint = input.sprintHeld && pState.stamina > 5 && pState.slideTimer <= 0;

  // Se o fôlego máximo (teto do dia) estiver baixo, reduz levemente o topo da explosão
  const fatigueCapFactor = 0.86 + (pState.maxStamina / 100) * 0.14;
  let targetSpeed =
    wishMag *
    (canSprint
      ? maxSprintSpeed * fatigueCapFactor
      : input.closeControlHeld
        ? baseJogSpeed * 0.72
        : baseJogSpeed);

  if (ball.ownerId === 'USER') {
    const dribbleEfficiency = 0.87 + (attrs.dribbling / 99) * 0.11;
    targetSpeed *= dribbleEfficiency;
  }

  if (pState.slideTimer > 0) {
    pState.vel.multiplyScalar(Math.max(0, 1 - 3.2 * dt));
  } else {
    const accelRate = 10.5 + (attrs.acceleration / 99) * 8.5;
    pState.vel.x += (tmpWish.x * targetSpeed - pState.vel.x) * Math.min(1, accelRate * dt);
    pState.vel.z += (tmpWish.z * targetSpeed - pState.vel.z) * Math.min(1, accelRate * dt);
  }

  pState.pos.addScaledVector(pState.vel, dt);
  pState.pos.x = Math.max(-PITCH.HALF_W - 1.5, Math.min(PITCH.HALF_W + 1.5, pState.pos.x));
  pState.pos.z = Math.max(-PITCH.HALF_L - 1.5, Math.min(PITCH.HALF_L + 1.5, pState.pos.z));

  // Fôlego curto estilo FIFA: gasta no sprint e recupera SOMENTE até pState.maxStamina (ex: 75% -> cai -> volta p/ 75%)!
  const enduranceFactor = 1.25 - (attrs.stamina / 99) * 0.55;
  if (canSprint && wishMag > 0.2) {
    pState.stamina = Math.max(0, pState.stamina - 7.2 * enduranceFactor * dt);
  } else {
    pState.stamina = Math.min(pState.maxStamina, pState.stamina + 4.2 * dt);
  }

  const horizSpeed = Math.hypot(pState.vel.x, pState.vel.z);
  if (horizSpeed > 0.25) {
    const desiredYaw = Math.atan2(pState.vel.x, pState.vel.z);
    const turnRate = 11 + (attrs.agility / 99) * 7;
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
    const leadDist = input.closeControlHeld ? 0.5 : canSprint ? 0.76 : 0.6;
    const sinY = Math.sin(pState.facingYaw);
    const cosY = Math.cos(pState.facingYaw);

    const targetBx = pState.pos.x + sinY * leadDist + cosY * footSide;
    const targetBz = pState.pos.z + cosY * leadDist - sinY * footSide;

    ball.pos.x += (targetBx - ball.pos.x) * Math.min(1, 22 * dt);
    ball.pos.z += (targetBz - ball.pos.z) * Math.min(1, 22 * dt);
    ball.pos.y = PITCH.BALL_RADIUS;
    ball.vel.copy(pState.vel);
  }

  // 3. Barra de Força Unificada Estilo FIFA (Passe A, Enfiada Y, Cruzamento X e Chute B)!
  let kicked: KickKind | null = null;
  let calledForBall: 'PASS' | 'THROUGH' | 'CROSS' | null = null;
  let commandedMateShoot = false;

  const canStrike =
    ball.ownerId === 'USER' ||
    (ball.ownerId === null && distToBall < 1.48 && ball.pos.y < 1.85);

  if (canStrike) {
    // Inicia carregamento ao segurar qualquer um dos 4 botões de ação com bola
    if (pState.chargeIntent === null) {
      if (input.shootHeld) {
        pState.chargeIntent = 'SHOT';
        pState.powerCharge01 = 0.08;
        pState.chargingFinesse = input.finesseHeld;
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
      if (pState.chargeIntent === 'SHOT' && input.finesseHeld) {
        pState.chargingFinesse = true;
      }
      pState.hudPower01 = pState.powerCharge01;
      pState.hudPowerHoldTimer = 0.38;

      const stillHeld =
        (pState.chargeIntent === 'SHOT' && input.shootHeld) ||
        (pState.chargeIntent === 'PASS' && input.passHeld) ||
        (pState.chargeIntent === 'THROUGH' && input.throughHeld) ||
        (pState.chargeIntent === 'CROSS' && input.lobHeld);

      // Dispara quando solta o botão OU quando atinge 100% da barra!
      if (!stillHeld || pState.powerCharge01 >= 0.995) {
        const intent = pState.chargeIntent;
        const power = Math.max(0.16, pState.powerCharge01);
        const isFinesse = pState.chargingFinesse || input.finesseHeld;

        pState.chargeIntent = null;
        pState.powerCharge01 = 0;
        pState.chargingFinesse = false;
        pState.hudPower01 = power;
        pState.hudPowerHoldTimer = 0.38;

        // Direção de mira = analógico/D-Pad se inclinado, senão frente da câmera!
        const baseAim = wishMag > 0.18 ? tmpWish.clone() : tmpForward.clone();

        ball.ownerId = null;
        ball.lastTouchBy = 'USER';
        ball.touchCooldown = 0.24;

        if (intent === 'SHOT') {
          if (isFinesse && ball.pos.z < 12) {
            // CHUTE COLOCADO COM CURVA CALIBRADA NA GAVETA!
            const goalZ = -PITCH.HALF_L;
            const aimProjectionX =
              baseAim.z < -0.2
                ? ball.pos.x + (baseAim.x / baseAim.z) * (goalZ - ball.pos.z)
                : 0;

            // Escolhe o canto alvo dentro do gol ([-3.05, +3.05]) conforme a sua mira ou canto cruzado natural!
            let cornerSign: -1 | 1;
            if (aimProjectionX < -0.75) cornerSign = -1;
            else if (aimProjectionX > 0.75) cornerSign = 1;
            else if (ball.pos.x > 1.4) cornerSign = -1;
            else if (ball.pos.x < -1.4) cornerSign = 1;
            else cornerSign = player.preferredFoot === 'ESQUERDA' ? 1 : -1;

            const errorScale = (1 - attrs.finishing / 99) * 0.55;
            const overChargeLift = power > 0.88 ? (power - 0.88) * 6.5 : 0;
            const targetX =
              cornerSign * (2.55 + Math.min(0.42, power * 0.4)) +
              (Math.random() - 0.5) * errorScale;
            const targetY = Math.min(
              2.85,
              0.75 + power * 1.45 + overChargeLift + (Math.random() - 0.5) * errorScale * 0.4,
            );

            // Define o sentido da curva para abrir por fora do goleiro e fechar no canto!
            const curlDir = targetX <= ball.pos.x ? 1 : -1; // +1 curva p/ esquerda (-X), -1 curva p/ direita (+X)
            const spinMag = 12.5 + (attrs.finishing / 99) * 4.5;
            const spinY = curlDir * spinMag;
            const spinX = -2.8;
            const shotHorizSpd = (18.5 + (attrs.shotPower / 99) * 8.5) * (0.62 + power * 0.42);

            const solvedVel = solveFinesseShotVelocity(
              ball.pos,
              targetX,
              targetY,
              shotHorizSpd,
              spinY,
              spinX,
            );
            ball.vel.copy(solvedVel);
            ball.spin.set(spinX, spinY, 0);
            pState.facingYaw = Math.atan2(solvedVel.x, solvedVel.z);
            kicked = 'FINESSE_SHOT';
            playBallKickSfx(0.55 + power * 0.4);
          } else {
            // CHUTE FORTE DE PEITO DE PÉ!
            const aimDir = baseAim.clone();
            const toGoalCenter = new THREE.Vector3(
              0 - ball.pos.x,
              0,
              -PITCH.HALF_L - ball.pos.z,
            ).normalize();
            if (aimDir.dot(toGoalCenter) > 0.35) {
              // Mantém liberdade de mirar nos cantos mas evita isolar pros lados sem querer
              const projX =
                aimDir.z < -0.2
                  ? ball.pos.x + (aimDir.x / aimDir.z) * (-PITCH.HALF_L - ball.pos.z)
                  : 0;
              const clampedGoalX = Math.max(-3.35, Math.min(3.35, projX * 0.78));
              const smartGoalDir = new THREE.Vector3(
                clampedGoalX - ball.pos.x,
                0,
                -PITCH.HALF_L - ball.pos.z,
              ).normalize();
              aimDir.lerp(smartGoalDir, 0.42 + (attrs.finishing / 99) * 0.22).normalize();
            }

            const maxShotSpeed = 21.5 + (attrs.shotPower / 99) * 13.5;
            const speed = maxShotSpeed * (0.5 + power * 0.54);
            const overPowerPenalty =
              power > 0.9 ? (power - 0.9) * 9 * (1.2 - (attrs.finishing / 99) * 0.65) : 0;
            const loftY = (0.04 + power * 0.28 + overPowerPenalty * 0.26) * speed;

            ball.vel.set(aimDir.x * speed, loftY, aimDir.z * speed);
            ball.spin.set(-5.0, (Math.random() - 0.5) * 2.2, 0);
            pState.facingYaw = Math.atan2(aimDir.x, aimDir.z);
            kicked = 'POWER_SHOT';
            playBallKickSfx(0.55 + power * 0.45);
          }
        } else if (intent === 'PASS') {
          // PASSE RASTEIRO COM FORÇA MEDIDA PELA BARRA!
          const toMate = new THREE.Vector3(
            teammatePos.x + teammateVel.x * 0.25 - ball.pos.x,
            0,
            teammatePos.z + teammateVel.z * 0.25 - ball.pos.z,
          );
          const mateDist = toMate.length();
          const mateDir = mateDist > 0.4 ? toMate.clone().normalize() : baseAim.clone();

          // Magnetismo inteligente: se mirar na direção geral do parceiro (±52°), ajusta fino nele; senão respeita sua mira livre!
          const align = baseAim.dot(mateDir);
          const dir =
            align > 0.6
              ? baseAim.clone().lerp(mateDir, 0.78).normalize()
              : align > 0.2 && wishMag < 0.2
                ? mateDir
                : baseAim.clone();

          const spd = 11.5 + power * (13.5 + (attrs.shortPass / 99) * 4.0);
          ball.vel.set(dir.x * spd, 0.25 + power * 0.45, dir.z * spd);
          ball.spin.set(0, 0, 0);
          pState.facingYaw = Math.atan2(dir.x, dir.z);
          kicked = 'GROUND_PASS';
          playBallKickSfx(0.38 + power * 0.35);
        } else if (intent === 'THROUGH') {
          // ENFIADA NAS COSTAS COM ALCANCE PROPORCIONAL À BARRA!
          const leadAhead = 4.0 + power * 9.5;
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

          const spd = 13.0 + power * (13.5 + (attrs.shortPass / 99) * 4.5);
          ball.vel.set(dir.x * spd, 0.35 + power * 0.6, dir.z * spd);
          ball.spin.set(3.5, 0, 0); // Backspin segura a bola na frente da corrida!
          pState.facingYaw = Math.atan2(dir.x, dir.z);
          kicked = 'THROUGH_BALL';
          playBallKickSfx(0.45 + power * 0.38);
        } else if (intent === 'CROSS') {
          // CRUZAMENTO / VIRADA DE JOGO COM FORÇA, ALTURA E CURVA REAIS!
          const desiredRange = 10.0 + power * (25.0 + (attrs.longPass / 99) * 6.0); // 10m até 41m!
          let dir = baseAim.clone();

          // Se estiver na ala cruzando para a área ou mirando perto do companheiro, ajuda a achar a cabeça/peito dele!
          const mateBoxSpot = new THREE.Vector3(
            teammatePos.x + teammateVel.x * 0.55,
            0,
            Math.max(-PITCH.HALF_L + 5.5, Math.min(teammatePos.z - 2.5, -29)),
          );
          const toBoxMate = mateBoxSpot.clone().sub(new THREE.Vector3(ball.pos.x, 0, ball.pos.z));
          const distToMateSpot = toBoxMate.length();
          if (distToMateSpot > 3) {
            const mateSpotDir = toBoxMate.clone().normalize();
            const onWing = Math.abs(ball.pos.x) > 9.5 && ball.pos.z < -12;
            if (baseAim.dot(mateSpotDir) > 0.52 || (onWing && wishMag < 0.22)) {
              dir = dir.lerp(mateSpotDir, 0.76).normalize();
            }
          }

          // Velocidade horizontal e arco calibrados para cair exatamente na distância da barra!
          const horizSpd = 11.5 + power * (14.5 + (attrs.longPass / 99) * 4.0);
          const flightTime = Math.min(2.1, Math.max(0.65, desiredRange / horizSpd));
          const loftY = Math.min(11.8, Math.max(4.8, 0.5 * Math.abs(BALL_AERO.GRAVITY) * flightTime * 0.88));

          const inwardSpinY = ball.pos.x > 3 ? 6.5 : ball.pos.x < -3 ? -6.5 : 0;
          ball.vel.set(dir.x * horizSpd, loftY, dir.z * horizSpd);
          ball.spin.set(-4.5, inwardSpinY, 0);
          pState.facingYaw = Math.atan2(dir.x, dir.z);
          kicked = 'LOB_CROSS';
          playBallKickSfx(0.48 + power * 0.45);
        }

        pState.kickAnimTimer = 0.28;
      }
    }
  } else {
    // SEM A BOLA: limpa eventual carga e processa pedidos instantâneos pro parceiro ou carrinho!
    pState.chargeIntent = null;
    pState.powerCharge01 = 0;
    pState.chargingFinesse = false;

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
          ball.vel.set(lungeDir.x * 11.5, 1.2, lungeDir.z * 11.5);
          playBallKickSfx(0.5);
        }
      } else {
        calledForBall = 'CROSS';
      }
    }
  }

  return { kicked, calledForBall, commandedMateShoot };
}
