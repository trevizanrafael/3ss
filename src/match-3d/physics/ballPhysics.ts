import * as THREE from 'three';
import { PITCH } from './pitchConstants';

export interface BallState {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  /** Efeito/rotação angular (rad/s) para curva Magnus real no ar! */
  spin: THREE.Vector3;
  /** Rotação visual acumulada da malha da bola */
  quat: THREE.Quaternion;
  ownerId: 'USER' | 'MATE' | 'GK' | null;
  lastTouchBy: 'USER' | 'MATE' | 'GK' | null;
  /** Cooldown curto após chutar/passar para o próprio pé não re-colar na bola no mesmo frame */
  touchCooldown: number;
  /** Intensidade de vibração da rede (0..1) quando a bola estufa o gol */
  netRipple: number;
  netHitPoint: THREE.Vector3;
}

export interface BallStepEvents {
  scoredNorthGoal: boolean;
  scoredSouthGoal: boolean;
  hitPost: boolean;
  wentOutOfBounds: boolean;
}

const GRAVITY = -11.4; // Gravidade esportiva calibrada para chutes tensos e cruzamentos naturais
const AIR_DRAG = 0.22;
const MAGNUS_COEFF = 0.038; // Intensidade real da curva colocada (RB + B)!
const GRASS_RESTITUTION = 0.58;
const GRASS_FRICTION = 2.65;

const tmpCross = new THREE.Vector3();
const tmpAxis = new THREE.Vector3();
const tmpQuat = new THREE.Quaternion();

export function createInitialBallState(x = 0, z = -14): BallState {
  return {
    pos: new THREE.Vector3(x, PITCH.BALL_RADIUS, z),
    vel: new THREE.Vector3(0, 0, 0),
    spin: new THREE.Vector3(0, 0, 0),
    quat: new THREE.Quaternion(),
    ownerId: null,
    lastTouchBy: null,
    touchCooldown: 0,
    netRipple: 0,
    netHitPoint: new THREE.Vector3(0, 1.2, -PITCH.HALF_L - 1.5),
  };
}

function collideSphereSegment(
  ball: BallState,
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number,
  segRadius: number,
): boolean {
  const abx = bx - ax;
  const aby = by - ay;
  const abz = bz - az;
  const abLenSq = abx * abx + aby * aby + abz * abz;
  const t =
    abLenSq > 1e-6
      ? Math.max(
          0,
          Math.min(
            1,
            ((ball.pos.x - ax) * abx + (ball.pos.y - ay) * aby + (ball.pos.z - az) * abz) / abLenSq,
          ),
        )
      : 0;

  const cx = ax + abx * t;
  const cy = ay + aby * t;
  const cz = az + abz * t;

  const dx = ball.pos.x - cx;
  const dy = ball.pos.y - cy;
  const dz = ball.pos.z - cz;
  const distSq = dx * dx + dy * dy + dz * dz;
  const minDist = PITCH.BALL_RADIUS + segRadius;

  if (distSq < minDist * minDist && distSq > 1e-8) {
    const dist = Math.sqrt(distSq);
    const nx = dx / dist;
    const ny = dy / dist;
    const nz = dz / dist;

    ball.pos.x = cx + nx * minDist;
    ball.pos.y = cy + ny * minDist;
    ball.pos.z = cz + nz * minDist;

    const vn = ball.vel.x * nx + ball.vel.y * ny + ball.vel.z * nz;
    if (vn < 0) {
      const bounce = 1.72; // Trave metálica elástica realista!
      ball.vel.x -= bounce * vn * nx;
      ball.vel.y -= bounce * vn * ny;
      ball.vel.z -= bounce * vn * nz;
      return true;
    }
  }
  return false;
}

function checkGoalPostsAndNet(ball: BallState, goalZSign: -1 | 1): { hitPost: boolean; inGoal: boolean } {
  const gz = goalZSign * PITCH.HALF_L;
  const backZ = goalZSign * (PITCH.HALF_L + PITCH.GOAL_DEPTH);
  const hw = PITCH.GOAL_HALF_W;
  const gh = PITCH.GOAL_HEIGHT;
  const pr = PITCH.POST_RADIUS;

  let hitPost = false;
  // Trave esquerda, Trave direita e Travessão superior
  if (collideSphereSegment(ball, -hw, 0, gz, -hw, gh, gz, pr)) hitPost = true;
  if (collideSphereSegment(ball, hw, 0, gz, hw, gh, gz, pr)) hitPost = true;
  if (collideSphereSegment(ball, -hw, gh, gz, hw, gh, gz, pr)) hitPost = true;

  const crossedLine =
    goalZSign === -1
      ? ball.pos.z < gz - PITCH.BALL_RADIUS * 0.65
      : ball.pos.z > gz + PITCH.BALL_RADIUS * 0.65;

  const insideMouth = Math.abs(ball.pos.x) < hw - pr && ball.pos.y < gh - pr;

  if (crossedLine && insideMouth) {
    // Contenção elástica suave das redes laterais, teto e fundo do gol!
    if (ball.pos.x < -hw + PITCH.BALL_RADIUS) {
      ball.pos.x = -hw + PITCH.BALL_RADIUS;
      ball.vel.x *= -0.18;
      ball.netRipple = Math.max(ball.netRipple, 0.65);
    } else if (ball.pos.x > hw - PITCH.BALL_RADIUS) {
      ball.pos.x = hw - PITCH.BALL_RADIUS;
      ball.vel.x *= -0.18;
      ball.netRipple = Math.max(ball.netRipple, 0.65);
    }

    if (ball.pos.y > gh - PITCH.BALL_RADIUS) {
      ball.pos.y = gh - PITCH.BALL_RADIUS;
      ball.vel.y *= -0.15;
    }

    const hitBackNet =
      goalZSign === -1
        ? ball.pos.z <= backZ + PITCH.BALL_RADIUS
        : ball.pos.z >= backZ - PITCH.BALL_RADIUS;

    if (hitBackNet) {
      ball.pos.z = goalZSign === -1 ? backZ + PITCH.BALL_RADIUS : backZ - PITCH.BALL_RADIUS;
      const impactSpeed = Math.min(1, ball.vel.length() / 22);
      ball.netRipple = Math.max(ball.netRipple, 0.45 + impactSpeed * 0.55);
      ball.netHitPoint.copy(ball.pos);
      ball.vel.z *= -0.12;
      ball.vel.x *= 0.45;
      ball.vel.y *= 0.35;
      ball.spin.multiplyScalar(0.2);
    }

    return { hitPost, inGoal: true };
  }

  return { hitPost, inGoal: false };
}

/**
 * Avança a física da bola com 4 sub-passos por frame (~240Hz) para colisões perfeitas
 * mesmo em bombas de 115 km/h na trave ou na gaveta!
 */
export function stepBallPhysics(ball: BallState, dt: number): BallStepEvents {
  const clampedDt = Math.min(dt, 0.05);
  ball.touchCooldown = Math.max(0, ball.touchCooldown - clampedDt);
  ball.netRipple = Math.max(0, ball.netRipple - clampedDt * 2.4);

  const events: BallStepEvents = {
    scoredNorthGoal: false,
    scoredSouthGoal: false,
    hitPost: false,
    wentOutOfBounds: false,
  };

  // Se um jogador estiver conduzindo colado ao pé, a rotação visual acompanha a velocidade!
  if (ball.ownerId !== null) {
    const speed = Math.hypot(ball.vel.x, ball.vel.z);
    if (speed > 0.05) {
      tmpAxis.set(ball.vel.z, 0, -ball.vel.x).normalize();
      tmpQuat.setFromAxisAngle(tmpAxis, (speed * clampedDt) / PITCH.BALL_RADIUS);
      ball.quat.premultiply(tmpQuat);
    }
    return events;
  }

  const subSteps = 4;
  const h = clampedDt / subSteps;

  for (let s = 0; s < subSteps; s++) {
    const speed = ball.vel.length();

    // 1. Gravidade + Arrasto Aerodinâmico + Efeito Magnus (Curva no Ar!)
    if (ball.pos.y > PITCH.BALL_RADIUS + 0.005 || ball.vel.y > 0.05) {
      ball.vel.y += GRAVITY * h;
      if (speed > 0.1) {
        const drag = Math.max(0, 1 - AIR_DRAG * h);
        ball.vel.multiplyScalar(drag);
        // Força de Magnus: F = spin × vel
        tmpCross.crossVectors(ball.spin, ball.vel).multiplyScalar(MAGNUS_COEFF * h);
        ball.vel.add(tmpCross);
      }
      ball.spin.multiplyScalar(Math.max(0, 1 - 0.55 * h));
    } else {
      // Bola rolando na grama cortada
      ball.pos.y = PITCH.BALL_RADIUS;
      ball.vel.y = 0;
      const horizSpeed = Math.hypot(ball.vel.x, ball.vel.z);
      if (horizSpeed > 0.04) {
        const drop = Math.max(0, horizSpeed - GRASS_FRICTION * h);
        const ratio = drop / horizSpeed;
        ball.vel.x *= ratio;
        ball.vel.z *= ratio;
      } else {
        ball.vel.set(0, 0, 0);
      }
      ball.spin.multiplyScalar(Math.max(0, 1 - 3.5 * h));
    }

    // 2. Integração de Posição
    ball.pos.addScaledVector(ball.vel, h);

    // 3. Quique realista no gramado
    if (ball.pos.y < PITCH.BALL_RADIUS) {
      ball.pos.y = PITCH.BALL_RADIUS;
      if (ball.vel.y < -0.65) {
        ball.vel.y = -ball.vel.y * GRASS_RESTITUTION;
        ball.vel.x *= 0.88;
        ball.vel.z *= 0.88;
      } else {
        ball.vel.y = 0;
      }
    }

    // 4. Traves, Travessão e Redes dos 2 Gols
    const north = checkGoalPostsAndNet(ball, -1);
    const south = checkGoalPostsAndNet(ball, 1);
    if (north.hitPost || south.hitPost) events.hitPost = true;
    if (north.inGoal) events.scoredNorthGoal = true;
    if (south.inGoal) events.scoredSouthGoal = true;

    // 5. Saída pela Linha Lateral ou Linha de Fundo (fora do gol)
    if (!north.inGoal && !south.inGoal) {
      if (
        Math.abs(ball.pos.x) > PITCH.HALF_W + 0.5 ||
        Math.abs(ball.pos.z) > PITCH.HALF_L + 0.65
      ) {
        events.wentOutOfBounds = true;
      }
    }
  }

  // Rotação visual 3D realista da bola (rolagem + spin no ar)
  const vHoriz = Math.hypot(ball.vel.x, ball.vel.z);
  if (vHoriz > 0.08) {
    tmpAxis.set(ball.vel.z, 0, -ball.vel.x).normalize();
    tmpQuat.setFromAxisAngle(tmpAxis, (vHoriz * clampedDt) / PITCH.BALL_RADIUS);
    ball.quat.premultiply(tmpQuat);
  }
  if (ball.spin.lengthSq() > 0.2) {
    tmpAxis.copy(ball.spin).normalize();
    tmpQuat.setFromAxisAngle(tmpAxis, ball.spin.length() * clampedDt * 0.45);
    ball.quat.premultiply(tmpQuat);
  }

  return events;
}
