import * as THREE from 'three';
import { CareerPlayer } from '../../domains/player/playerTypes';
import { playBallKickSfx } from '../audio/matchAudio';
import { LivePitchInput } from '../input/usePitchInput';
import { KickKind } from '../types';
import { BallState } from './ballPhysics';
import { PITCH } from './pitchConstants';

export interface PlayerPitchState {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  facingYaw: number;
  stamina: number; // 0..100
  shotCharge01: number; // 0..1
  chargingFinesse: boolean;
  kickAnimTimer: number;
  slideTimer: number;
}

const tmpForward = new THREE.Vector3();
const tmpRight = new THREE.Vector3();
const tmpWish = new THREE.Vector3();

export function createInitialPlayerPitchState(startStamina = 100): PlayerPitchState {
  return {
    pos: new THREE.Vector3(0, 0, -11),
    vel: new THREE.Vector3(0, 0, 0),
    facingYaw: 0, // Olhando para o Gol Norte (-Z)
    stamina: startStamina,
    shotCharge01: 0,
    chargingFinesse: false,
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
  dt: number,
): { kicked: KickKind | null; calledForBall: 'PASS' | 'THROUGH' | 'CROSS' | null } {
  const attrs = player.attributes;
  pState.kickAnimTimer = Math.max(0, pState.kickAnimTimer - dt);
  pState.slideTimer = Math.max(0, pState.slideTimer - dt);

  // 1. Vetores relativos para onde a Câmera está olhando!
  tmpForward.set(-Math.sin(camYaw), 0, -Math.cos(camYaw)).normalize();
  tmpRight.set(Math.cos(camYaw), 0, -Math.sin(camYaw)).normalize();

  tmpWish
    .set(0, 0, 0)
    .addScaledVector(tmpRight, input.moveX)
    .addScaledVector(tmpForward, -input.moveZ);

  const wishMag = Math.min(1, tmpWish.length());
  if (wishMag > 0.01) tmpWish.normalize();

  // Velocidade real baseada nos atributos 0-99 do seu Pro!
  const baseJogSpeed = 5.4 + (attrs.agility / 99) * 1.4;
  const maxSprintSpeed = 7.6 + (attrs.sprintSpeed / 99) * 3.1; // 7.6 a 10.7 m/s!
  const canSprint = input.sprintHeld && pState.stamina > 6 && pState.slideTimer <= 0;

  let targetSpeed =
    wishMag * (canSprint ? maxSprintSpeed : input.closeControlHeld ? baseJogSpeed * 0.72 : baseJogSpeed);

  // Conduzir a bola reduz sutilmente o pico conforme atributo Dribbling
  if (ball.ownerId === 'USER') {
    const dribbleEfficiency = 0.86 + (attrs.dribbling / 99) * 0.11;
    targetSpeed *= dribbleEfficiency;
  }

  if (pState.slideTimer > 0) {
    // Escorregando no carrinho
    pState.vel.multiplyScalar(Math.max(0, 1 - 3.2 * dt));
  } else {
    const accelRate = 9.5 + (attrs.acceleration / 99) * 8.5;
    pState.vel.x += (tmpWish.x * targetSpeed - pState.vel.x) * Math.min(1, accelRate * dt);
    pState.vel.z += (tmpWish.z * targetSpeed - pState.vel.z) * Math.min(1, accelRate * dt);
  }

  pState.pos.addScaledVector(pState.vel, dt);
  pState.pos.x = Math.max(-PITCH.HALF_W - 1.5, Math.min(PITCH.HALF_W + 1.5, pState.pos.x));
  pState.pos.z = Math.max(-PITCH.HALF_L - 1.2, Math.min(PITCH.HALF_L + 1.2, pState.pos.z));

  // Consumo e recuperação suave de fôlego (escalado pelo atributo Stamina)
  const enduranceFactor = 1.25 - (attrs.stamina / 99) * 0.55;
  if (canSprint && wishMag > 0.2) {
    pState.stamina = Math.max(0, pState.stamina - 6.8 * enduranceFactor * dt);
  } else {
    pState.stamina = Math.min(100, pState.stamina + 3.4 * dt);
  }

  // Rotação suave do corpo na direção da corrida (ou olhando para a bola em condução curta LT)
  const horizSpeed = Math.hypot(pState.vel.x, pState.vel.z);
  if (horizSpeed > 0.35) {
    // Em Three.js, frente +Z do boneco aponta em atan2(vx, vz)
    const desiredYaw = Math.atan2(pState.vel.x, pState.vel.z);
    const turnRate = 10 + (attrs.agility / 99) * 7;
    pState.facingYaw += shortestAngleDiff(pState.facingYaw, desiredYaw) * Math.min(1, turnRate * dt);
  }

  // 2. Domínio / Condução Natural da Bola no Pé!
  const distToBall = Math.hypot(ball.pos.x - pState.pos.x, ball.pos.z - pState.pos.z);
  const controlRadius = 0.85 + (attrs.ballControl / 99) * 0.32;

  if (
    ball.ownerId === null &&
    ball.touchCooldown <= 0 &&
    distToBall < controlRadius &&
    ball.pos.y < 1.35
  ) {
    ball.ownerId = 'USER';
    ball.lastTouchBy = 'USER';
    ball.spin.set(0, 0, 0);
  }

  if (ball.ownerId === 'USER') {
    const footSide = player.preferredFoot === 'ESQUERDA' ? -0.14 : 0.14;
    const leadDist = input.closeControlHeld ? 0.52 : canSprint ? 0.78 : 0.62;
    const sinY = Math.sin(pState.facingYaw);
    const cosY = Math.cos(pState.facingYaw);

    const targetBx = pState.pos.x + sinY * leadDist + cosY * footSide;
    const targetBz = pState.pos.z + cosY * leadDist - sinY * footSide;

    ball.pos.x += (targetBx - ball.pos.x) * Math.min(1, 20 * dt);
    ball.pos.z += (targetBz - ball.pos.z) * Math.min(1, 20 * dt);
    ball.pos.y = PITCH.BALL_RADIUS;
    ball.vel.copy(pState.vel);
  }

  // 3. Ações com Bola (Chute c/ Força, Colocado c/ Curva, Passe, Enfiada, Cruzamento) vs Sem Bola (Pedir Passe / Carrinho)!
  let kicked: KickKind | null = null;
  let calledForBall: 'PASS' | 'THROUGH' | 'CROSS' | null = null;

  const canStrike = ball.ownerId === 'USER' || (ball.ownerId === null && distToBall < 1.35 && ball.pos.y < 1.6);

  if (canStrike) {
    if (input.shootHeld) {
      pState.shotCharge01 = Math.min(1, pState.shotCharge01 + dt * 1.45);
      pState.chargingFinesse = input.finesseHeld;
    } else if (input.shootJustReleased && pState.shotCharge01 > 0.04) {
      const power = pState.shotCharge01;
      const isFinesse = pState.chargingFinesse || input.finesseHeld;
      pState.shotCharge01 = 0;

      // Direção da câmera com leve assistência inteligente para o gol atacado!
      const aimDir = tmpForward.clone();
      const toGoalCenter = new THREE.Vector3(0 - ball.pos.x, 0, -PITCH.HALF_L - ball.pos.z).normalize();
      if (aimDir.dot(toGoalCenter) > 0.45) {
        // Assistência sutil proporcional à Finalização (sem tirar sua liberdade de mirar nos cantos!)
        aimDir.lerp(toGoalCenter, 0.16 + (attrs.finishing / 99) * 0.12).normalize();
      }

      const maxShotSpeed = 21 + (attrs.shotPower / 99) * 13.5; // Até ~34.5 m/s (124 km/h)!
      const speed = maxShotSpeed * (0.48 + power * 0.56);

      // Se passar de 90% na barra, pode subir demais (isolada!) conforme falta de Finishing
      const overPowerPenalty =
        power > 0.9 ? (power - 0.9) * 10 * (1.25 - (attrs.finishing / 99) * 0.65) : 0;
      const loftY = (0.06 + power * 0.34 + overPowerPenalty * 0.28) * speed;

      ball.ownerId = null;
      ball.lastTouchBy = 'USER';
      ball.touchCooldown = 0.24;
      ball.vel.set(aimDir.x * speed, loftY, aimDir.z * speed);

      if (isFinesse) {
        // Curva Magnus real! Chuta abrindo e a bola faz a curva fechando na gaveta!
        const curveSign =
          ball.pos.x > 1.5 ? 1 : ball.pos.x < -1.5 ? -1 : player.preferredFoot === 'ESQUERDA' ? 1 : -1;
        const curveStrength = 15 + (attrs.finishing / 99) * 11;
        // Compensação inicial para fora para desenhar o arco bonito no ar
        ball.vel.x -= curveSign * 2.8;
        ball.spin.set(-2.5, curveSign * curveStrength, 0);
        kicked = 'FINESSE_SHOT';
      } else {
        // Bomba de peito de pé com leve folha-seca (topspin)
        ball.spin.set(-5.5, (Math.random() - 0.5) * 3, 0);
        kicked = 'POWER_SHOT';
      }

      pState.facingYaw = Math.atan2(aimDir.x, aimDir.z);
      pState.kickAnimTimer = 0.28;
      playBallKickSfx(0.5 + power * 0.5);
    } else if (input.passJustPressed || input.throughJustPressed || input.lobOrSlideJustPressed) {
      pState.shotCharge01 = 0;
      const toMate = new THREE.Vector3(
        teammatePos.x - ball.pos.x,
        0,
        teammatePos.z - ball.pos.z,
      );
      const mateDist = toMate.length();
      const mateDir = mateDist > 0.5 ? toMate.clone().normalize() : tmpForward.clone();

      // Mira assistida para o companheiro se você estiver olhando na direção geral dele; senão passa pra onde olha!
      const useMateAssist = tmpForward.dot(mateDir) > 0.15;

      ball.ownerId = null;
      ball.lastTouchBy = 'USER';
      ball.touchCooldown = 0.24;

      if (input.passJustPressed) {
        const dir = useMateAssist ? mateDir : tmpForward.clone();
        const spd = Math.min(23, Math.max(13, (useMateAssist ? mateDist * 1.18 : 17) + (attrs.shortPass / 99) * 3));
        ball.vel.set(dir.x * spd, 0.4, dir.z * spd);
        ball.spin.set(0, 0, 0);
        pState.facingYaw = Math.atan2(dir.x, dir.z);
        kicked = 'GROUND_PASS';
        playBallKickSfx(0.45);
      } else if (input.throughJustPressed) {
        // Passe enfiado no espaço à frente da corrida do companheiro (rumo ao gol)!
        const leadPoint = new THREE.Vector3(
          teammatePos.x * 0.85,
          0,
          Math.max(-PITCH.HALF_L + 5, teammatePos.z - 8.5),
        );
        const dir = useMateAssist
          ? leadPoint.sub(new THREE.Vector3(ball.pos.x, 0, ball.pos.z)).normalize()
          : tmpForward.clone();
        const spd = 16 + (attrs.shortPass / 99) * 5;
        ball.vel.set(dir.x * spd, 0.5, dir.z * spd);
        ball.spin.set(3, 0, 0); // Backspin leve para frear no espaço!
        pState.facingYaw = Math.atan2(dir.x, dir.z);
        kicked = 'THROUGH_BALL';
        playBallKickSfx(0.55);
      } else {
        // Cruzamento / Lançamento Alto (X)
        const dir = useMateAssist ? mateDir : tmpForward.clone();
        const spd = 14 + (attrs.longPass / 99) * 6;
        ball.vel.set(dir.x * spd, 8.8, dir.z * spd);
        ball.spin.set(-4, 0, 0);
        pState.facingYaw = Math.atan2(dir.x, dir.z);
        kicked = 'LOB_CROSS';
        playBallKickSfx(0.68);
      }
      pState.kickAnimTimer = 0.26;
    }
  } else {
    // SEM A BOLA: Pedir Passe no Pé (A), Pedir Enfiada nas Costas (Y), Pedir Cruzamento ou Dar Carrinho (X)!
    pState.shotCharge01 = 0;
    if (input.passJustPressed) calledForBall = 'PASS';
    else if (input.throughJustPressed) calledForBall = 'THROUGH';
    else if (input.lobOrSlideJustPressed) {
      if (ball.ownerId === 'MATE') {
        calledForBall = 'CROSS';
      } else if (pState.slideTimer <= 0 && horizSpeed > 2.5) {
        pState.slideTimer = 0.42;
        pState.vel.multiplyScalar(1.32);
        // Se alcançar a bola no carrinho, dá um toque de desarme!
        if (distToBall < 1.85) {
          const lungeDir = new THREE.Vector3(Math.sin(pState.facingYaw), 0, Math.cos(pState.facingYaw));
          ball.ownerId = null;
          ball.lastTouchBy = 'USER';
          ball.touchCooldown = 0.22;
          ball.vel.set(lungeDir.x * 11, 1.2, lungeDir.z * 11);
          playBallKickSfx(0.5);
        }
      } else {
        calledForBall = 'CROSS';
      }
    }
  }

  return { kicked, calledForBall };
}
