import * as THREE from 'three';
import {
  animatePitchActor,
  PitchActorInstance,
  PitchPoseState,
} from '../actors/pitchActorRig';
import { PITCH } from '../physics/pitchConstants';

export interface ReplayActorSnapshot {
  x: number;
  z: number;
  yaw: number;
  pose: PitchPoseState;
  speed: number;
  animParam: number;
  useLeftFoot: boolean;
}

export interface ReplayFrameSnapshot {
  ballPos: THREE.Vector3;
  ballSpeed: number;
  ballQuat: THREE.Quaternion;
  ballOwnerId: string | null;
  netRipple: number;
  netHitPoint: THREE.Vector3;
  actors: ReplayActorSnapshot[];
}

export class GoalReplayRecorder {
  private readonly capacity: number;
  private readonly ring: ReplayFrameSnapshot[];
  private writeIdx = 0;
  private count = 0;

  constructor(actorCount: number, capacityFrames = 285) {
    this.capacity = capacityFrames;
    this.ring = Array.from({ length: capacityFrames }, () => ({
      ballPos: new THREE.Vector3(),
      ballSpeed: 0,
      ballQuat: new THREE.Quaternion(),
      ballOwnerId: null,
      netRipple: 0,
      netHitPoint: new THREE.Vector3(),
      actors: Array.from({ length: actorCount }, () => ({
        x: 0,
        z: 0,
        yaw: 0,
        pose: 'IDLE' as PitchPoseState,
        speed: 0,
        animParam: 0,
        useLeftFoot: false,
      })),
    }));
  }

  clear(): void {
    this.writeIdx = 0;
    this.count = 0;
  }

  recordFrame(
    ballPos: THREE.Vector3,
    ballVel: THREE.Vector3,
    ballQuat: THREE.Quaternion,
    ballOwnerId: string | null,
    netRipple: number,
    netHitPoint: THREE.Vector3,
    actorStates: ReplayActorSnapshot[],
  ): void {
    const slot = this.ring[this.writeIdx];
    slot.ballPos.copy(ballPos);
    slot.ballSpeed = ballVel.length();
    slot.ballQuat.copy(ballQuat);
    slot.ballOwnerId = ballOwnerId;
    slot.netRipple = netRipple;
    slot.netHitPoint.copy(netHitPoint);

    const len = Math.min(slot.actors.length, actorStates.length);
    for (let i = 0; i < len; i++) {
      const dst = slot.actors[i];
      const src = actorStates[i];
      dst.x = src.x;
      dst.z = src.z;
      dst.yaw = src.yaw;
      dst.pose = src.pose;
      dst.speed = src.speed;
      dst.animParam = src.animParam;
      dst.useLeftFoot = src.useLeftFoot;
    }

    this.writeIdx = (this.writeIdx + 1) % this.capacity;
    if (this.count < this.capacity) this.count += 1;
  }

  /**
   * Extrai uma fita ordenada cronologicamente dos últimos ~4.5s para reproduzir o Replay do Gol!
   */
  extractClip(): {
    frames: ReplayFrameSnapshot[];
    shotOrigin: THREE.Vector3;
    goalZ: number;
  } {
    const frames: ReplayFrameSnapshot[] = [];
    const start = (this.writeIdx - this.count + this.capacity) % this.capacity;
    for (let i = 0; i < this.count; i++) {
      frames.push(this.ring[(start + i) % this.capacity]);
    }

    // Descobre se o gol foi no Norte (-HALF_L) ou no Sul (+HALF_L)
    const lastBall = frames[frames.length - 1]?.ballPos;
    const goalZ = lastBall && lastBall.z > 0 ? PITCH.HALF_L : -PITCH.HALF_L;

    // Procura de trás pra frente o instante exato da batida pro gol (última saída do pé ou pico de velocidade)
    let shotFrameIdx = Math.max(0, frames.length - 95);
    for (let i = frames.length - 25; i >= Math.max(1, frames.length - 210); i--) {
      const prev = frames[i - 1];
      const curr = frames[i];
      if (prev.ballOwnerId !== null && curr.ballOwnerId === null) {
        shotFrameIdx = i;
        break;
      }
      if (curr.ballSpeed - prev.ballSpeed > 7.5) {
        shotFrameIdx = i;
        break;
      }
    }

    // Começa o clipe ~1.3s (78 frames) antes da finalização para mostrar a jogada e a batida!
    const clipStartIdx = Math.max(0, shotFrameIdx - 78);
    const trimmed = frames.slice(clipStartIdx);
    const shotOrigin = (frames[shotFrameIdx]?.ballPos ?? new THREE.Vector3(0, 0, goalZ * 0.5)).clone();

    return { frames: trimmed, shotOrigin, goalZ };
  }
}

/**
 * Aplica um frame gravado em todos os 22 atores + bola + câmera de costas para a finalização!
 */
export function applyReplayFrameAndCamera(
  frame: ReplayFrameSnapshot,
  progress01: number,
  shotOrigin: THREE.Vector3,
  goalZ: number,
  actors: PitchActorInstance[],
  ballMesh: THREE.Mesh,
  camera: THREE.PerspectiveCamera,
  dt: number,
  timeSec: number,
): void {
  ballMesh.position.copy(frame.ballPos);
  ballMesh.quaternion.copy(frame.ballQuat);

  const count = Math.min(actors.length, frame.actors.length);
  for (let i = 0; i < count; i++) {
    const a = actors[i];
    const st = frame.actors[i];
    a.root.position.set(st.x, 0, st.z);
    a.root.rotation.y = st.yaw;
    animatePitchActor(a, st.pose, st.speed, st.animParam, st.useLeftFoot, dt, timeSec);
  }

  // Câmera dramática DE COSTAS PARA O CHUTE acompanhando a curva até estufar a rede!
  const toGoalX = 0 - shotOrigin.x;
  const toGoalZ = goalZ - shotOrigin.z;
  const distToGoal = Math.max(6, Math.hypot(toGoalX, toGoalZ));
  const dirX = toGoalX / distToGoal;
  const dirZ = toGoalZ / distToGoal;

  // Leve deslocamento lateral p/ nunca tampar a bola com as costas do batedor
  const perpX = -dirZ * (shotOrigin.x >= 0 ? 1.15 : -1.15);
  const perpZ = dirX * (shotOrigin.x >= 0 ? 1.15 : -1.15);

  const dollyAdvance = progress01 * Math.min(6.5, distToGoal * 0.25);
  const camX = Math.max(
    -PITCH.HALF_W - 6,
    Math.min(PITCH.HALF_W + 6, shotOrigin.x - dirX * (8.2 - dollyAdvance) + perpX),
  );
  const camZ = Math.max(
    -PITCH.HALF_L - 6,
    Math.min(PITCH.HALF_L + 6, shotOrigin.z - dirZ * (8.2 - dollyAdvance) + perpZ),
  );
  const camY = 2.65 + progress01 * 0.45;

  camera.position.set(camX, camY, camZ);
  camera.lookAt(
    frame.ballPos.x * 0.78,
    Math.max(0.95, Math.min(2.6, frame.ballPos.y * 0.85 + 0.55)),
    frame.ballPos.z * 0.72 + goalZ * 0.28,
  );
}
