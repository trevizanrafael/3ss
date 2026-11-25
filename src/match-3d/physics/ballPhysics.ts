import * as THREE from 'three';
import { PITCH } from './pitchConstants';

export interface BallState {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  /** Efeito/rotação angular (rad/s) para curva Magnus real no ar! */
  spin: THREE.Vector3;
  /** Rotação visual acumulada da malha da bola */
  quat: THREE.Quaternion;
  ownerId: string | null;
  lastTouchBy: string | null;
  lastTouchTeam: 'HOME' | 'AWAY' | null;
  touchCooldown: number;
  /** Só fica preenchido quando a bola entrou PELA FRENTE da boca do gol! */
  enteredGoalSide: 'NORTH' | 'SOUTH' | null;
  netRipple: number;
  netHitPoint: THREE.Vector3;
}

export interface BallStepEvents {
  scoredNorthGoal: boolean;
  scoredSouthGoal: boolean;
  hitPost: boolean;
  wentOutOfBounds: boolean;
}

export const BALL_AERO = {
  GRAVITY: -15.4, // Firme e pesada, permitindo chutes tensos que sobem na gaveta sem pingar antes!
  AIR_DRAG: 0.18,
  MAGNUS_COEFF: 0.038, // Curva chapada de fora pra dentro estilo FIFA!
  GRASS_RESTITUTION: 0.46,
  GRASS_FRICTION: 2.95,
} as const;

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
    lastTouchTeam: null,
    touchCooldown: 0,
    enteredGoalSide: null,
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
      const bounce = 1.68;
      ball.vel.x -= bounce * vn * nx;
      ball.vel.y -= bounce * vn * ny;
      ball.vel.z -= bounce * vn * nz;
      if (ball.ownerId !== null) {
        ball.ownerId = null;
        ball.touchCooldown = 0.2;
      }
      return true;
    }
  }
  return false;
}

/**
 * Verifica traves, travessão e entrada ESTRITA pela frente da boca do gol!
 * Se a bola passar por cima do travessão ou por fora da trave, ela bate no lado EXTERNO
 * da rede superior/lateral e NUNCA conta gol!
 */
function checkGoalPostsAndNet(
  ball: BallState,
  prevX: number,
  prevY: number,
  prevZ: number,
  goalZSign: -1 | 1,
): { hitPost: boolean; inGoal: boolean } {
  const sideTag = goalZSign === -1 ? 'NORTH' : 'SOUTH';
  const gz = goalZSign * PITCH.HALF_L;
  const backZ = goalZSign * (PITCH.HALF_L + PITCH.GOAL_DEPTH);
  const hw = PITCH.GOAL_HALF_W;
  const gh = PITCH.GOAL_HEIGHT;
  const pr = PITCH.POST_RADIUS;
  const br = PITCH.BALL_RADIUS;

  let hitPost = false;
  if (collideSphereSegment(ball, -hw, 0, gz, -hw, gh, gz, pr)) hitPost = true;
  if (collideSphereSegment(ball, hw, 0, gz, hw, gh, gz, pr)) hitPost = true;
  if (collideSphereSegment(ball, -hw, gh, gz, hw, gh, gz, pr)) hitPost = true;

  // 1. Checa cruzamento EXATO do plano frontal da linha de gol (vindo de dentro do campo!)
  if (ball.enteredGoalSide === null) {
    const wasInField = goalZSign === -1 ? prevZ >= gz - br * 0.45 : prevZ <= gz + br * 0.45;
    const nowPastLine = goalZSign === -1 ? ball.pos.z < gz - br * 0.45 : ball.pos.z > gz + br * 0.45;

    if (wasInField && nowPastLine) {
      const denom = ball.pos.z - prevZ;
      const t = Math.abs(denom) > 1e-5 ? Math.max(0, Math.min(1, (gz - prevZ) / denom)) : 1;
      const crossX = prevX + (ball.pos.x - prevX) * t;
      const crossY = prevY + (ball.pos.y - prevY) * t;

      // SÓ valida entrada no gol se passou ABAIXO do travessão e ENTRE as duas traves!
      if (Math.abs(crossX) < hw - pr * 0.8 && crossY < gh - pr * 0.8 && crossY >= 0) {
        ball.enteredGoalSide = sideTag;
        if (ball.ownerId !== null) {
          ball.ownerId = null;
          ball.touchCooldown = 0.5;
          ball.netRipple = Math.max(ball.netRipple, 0.55);
          ball.netHitPoint.copy(ball.pos);
        }
      }
    }
  }

  // 2. Se a bola entrou legitimamente pela frente do gol, a rede interna amortece e segura lá dentro!
  if (ball.enteredGoalSide === sideTag) {
    if (ball.pos.x < -hw + br) {
      ball.pos.x = -hw + br;
      ball.vel.x *= -0.18;
      ball.netRipple = Math.max(ball.netRipple, 0.65);
    } else if (ball.pos.x > hw - br) {
      ball.pos.x = hw - br;
      ball.vel.x *= -0.18;
      ball.netRipple = Math.max(ball.netRipple, 0.65);
    }

    if (ball.pos.y > gh - br) {
      ball.pos.y = gh - br;
      ball.vel.y *= -0.15;
    }

    const hitBackNet =
      goalZSign === -1 ? ball.pos.z <= backZ + br : ball.pos.z >= backZ - br;

    if (hitBackNet) {
      ball.pos.z = goalZSign === -1 ? backZ + br : backZ - br;
      const impactSpeed = Math.min(1, ball.vel.length() / 22);
      ball.netRipple = Math.max(ball.netRipple, 0.45 + impactSpeed * 0.55);
      ball.netHitPoint.copy(ball.pos);
      ball.vel.z *= -0.12;
      ball.vel.x *= 0.42;
      ball.vel.y *= 0.32;
      ball.spin.multiplyScalar(0.2);
    }

    return { hitPost, inGoal: true };
  }

  // 3. Se NÃO entrou pela frente (foi por cima ou por fora), colide pelo LADO DE FORA do teto e laterais da rede!
  const inGoalZDepth =
    goalZSign === -1
      ? ball.pos.z < gz && ball.pos.z > backZ - br
      : ball.pos.z > gz && ball.pos.z < backZ + br;

  if (inGoalZDepth && Math.abs(ball.pos.x) < hw + br) {
    // Caiu por cima do teto da rede -> quica macio em cima da rede e vai pra fora!
    if (prevY >= gh && ball.pos.y < gh + br) {
      ball.pos.y = gh + br;
      if (ball.vel.y < 0) ball.vel.y *= -0.22;
      ball.vel.x *= 0.78;
      ball.vel.z *= 0.78;
      ball.netRipple = Math.max(ball.netRipple, 0.3);
      ball.netHitPoint.copy(ball.pos);
    } else if (ball.pos.y < gh) {
      // Bateu na rede lateral pelo lado de fora!
      if (prevX <= -hw && ball.pos.x > -hw - br) {
        ball.pos.x = -hw - br;
        if (ball.vel.x > 0) ball.vel.x *= -0.25;
      } else if (prevX >= hw && ball.pos.x < hw + br) {
        ball.pos.x = hw + br;
        if (ball.vel.x < 0) ball.vel.x *= -0.25;
      }
    }
  }

  return { hitPost, inGoal: false };
}

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

  if (ball.ownerId !== null) {
    const speed = Math.hypot(ball.vel.x, ball.vel.z);
    if (speed > 0.05) {
      tmpAxis.set(ball.vel.z, 0, -ball.vel.x).normalize();
      tmpQuat.setFromAxisAngle(tmpAxis, (speed * clampedDt) / PITCH.BALL_RADIUS);
      ball.quat.premultiply(tmpQuat);
    }

    const prevZ = ball.pos.z - ball.vel.z * clampedDt;
    const prevX = ball.pos.x - ball.vel.x * clampedDt;
    const north = checkGoalPostsAndNet(ball, prevX, ball.pos.y, prevZ, -1);
    const south = checkGoalPostsAndNet(ball, prevX, ball.pos.y, prevZ, 1);
    if (north.hitPost || south.hitPost) events.hitPost = true;
    if (north.inGoal) events.scoredNorthGoal = true;
    if (south.inGoal) events.scoredSouthGoal = true;

    const isKeeperHolding =
      ball.ownerId === 'GK' || ball.ownerId === 'HOME_GK' || ball.ownerId === 'AWAY_GK';
    if (!north.inGoal && !south.inGoal && !isKeeperHolding) {
      if (
        Math.abs(ball.pos.x) > PITCH.HALF_W + 0.35 ||
        Math.abs(ball.pos.z) > PITCH.HALF_L + 0.45
      ) {
        ball.ownerId = null;
        events.wentOutOfBounds = true;
      }
    }
    return events;
  }

  const subSteps = 4;
  const h = clampedDt / subSteps;

  for (let s = 0; s < subSteps; s++) {
    const prevX = ball.pos.x;
    const prevY = ball.pos.y;
    const prevZ = ball.pos.z;
    const speed = ball.vel.length();

    if (ball.pos.y > PITCH.BALL_RADIUS + 0.005 || ball.vel.y > 0.05) {
      ball.vel.y += BALL_AERO.GRAVITY * h;
      if (speed > 0.1) {
        const drag = Math.max(0, 1 - BALL_AERO.AIR_DRAG * h);
        ball.vel.multiplyScalar(drag);
        tmpCross.crossVectors(ball.spin, ball.vel).multiplyScalar(BALL_AERO.MAGNUS_COEFF * h);
        ball.vel.add(tmpCross);
      }
      ball.spin.multiplyScalar(Math.max(0, 1 - 0.35 * h));
    } else {
      ball.pos.y = PITCH.BALL_RADIUS;
      ball.vel.y = 0;
      const horizSpeed = Math.hypot(ball.vel.x, ball.vel.z);
      if (horizSpeed > 0.04) {
        const drop = Math.max(0, horizSpeed - BALL_AERO.GRASS_FRICTION * h);
        const ratio = drop / horizSpeed;
        ball.vel.x *= ratio;
        ball.vel.z *= ratio;
      } else {
        ball.vel.set(0, 0, 0);
      }
      ball.spin.multiplyScalar(Math.max(0, 1 - 3.5 * h));
    }

    ball.pos.addScaledVector(ball.vel, h);

    if (ball.pos.y < PITCH.BALL_RADIUS) {
      ball.pos.y = PITCH.BALL_RADIUS;
      if (ball.vel.y < -0.65) {
        ball.vel.y = -ball.vel.y * BALL_AERO.GRASS_RESTITUTION;
        ball.vel.x *= 0.88;
        ball.vel.z *= 0.88;
      } else {
        ball.vel.y = 0;
      }
    }

    const north = checkGoalPostsAndNet(ball, prevX, prevY, prevZ, -1);
    const south = checkGoalPostsAndNet(ball, prevX, prevY, prevZ, 1);
    if (north.hitPost || south.hitPost) events.hitPost = true;
    if (north.inGoal) events.scoredNorthGoal = true;
    if (south.inGoal) events.scoredSouthGoal = true;

    if (!north.inGoal && !south.inGoal && ball.enteredGoalSide === null) {
      if (
        Math.abs(ball.pos.x) > PITCH.HALF_W + 0.55 ||
        Math.abs(ball.pos.z) > PITCH.HALF_L + 0.75
      ) {
        events.wentOutOfBounds = true;
      }
    }
  }

  const vHoriz = Math.hypot(ball.vel.x, ball.vel.z);
  if (vHoriz > 0.08) {
    tmpAxis.set(ball.vel.z, 0, -ball.vel.x).normalize();
    tmpQuat.setFromAxisAngle(tmpAxis, (vHoriz * clampedDt) / PITCH.BALL_RADIUS);
    ball.quat.premultiply(tmpQuat);
  }
  if (ball.spin.lengthSq() > 0.2) {
    tmpAxis.copy(ball.spin).normalize();
    tmpQuat.setFromAxisAngle(tmpAxis, ball.spin.length() * clampedDt * 0.5);
    ball.quat.premultiply(tmpQuat);
  }

  return events;
}
