import * as THREE from 'three';
import {
  animatePitchActor,
  PitchActorInstance,
  PitchPoseState,
} from '../actors/pitchActorRig';
import { PITCH } from '../physics/pitchConstants';

export type ReplayCameraAngle = 'BEHIND_WIDE' | 'TV_BROADCAST' | 'BEHIND_GOAL';

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

  constructor(actorCount: number, capacityFrames = 300) {
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

  extractClip(forGoal = true): {
    frames: ReplayFrameSnapshot[];
    shotOrigin: THREE.Vector3;
    goalZ: number;
  } {
    const frames: ReplayFrameSnapshot[] = [];
    const start = (this.writeIdx - this.count + this.capacity) % this.capacity;
    for (let i = 0; i < this.count; i++) {
      frames.push(this.ring[(start + i) % this.capacity]);
    }

    const lastBall = frames[frames.length - 1]?.ballPos;
    const goalZ = lastBall && lastBall.z > 0 ? PITCH.HALF_L : -PITCH.HALF_L;

    if (!forGoal) {
      const origin = (frames[Math.floor(frames.length * 0.35)]?.ballPos ?? new THREE.Vector3()).clone();
      return { frames, shotOrigin: origin, goalZ };
    }

    let shotFrameIdx = Math.max(0, frames.length - 105);
    for (let i = frames.length - 25; i >= Math.max(1, frames.length - 220); i--) {
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

    const clipStartIdx = Math.max(0, shotFrameIdx - 84);
    const trimmed = frames.slice(clipStartIdx);
    const shotOrigin = (frames[shotFrameIdx]?.ballPos ?? new THREE.Vector3(0, 0, goalZ * 0.5)).clone();

    return { frames: trimmed, shotOrigin, goalZ };
  }
}

/**
 * Câmera Ampla de Replay (Zoom Out generoso estilo transmissão FIFA, mostrando o lance inteiro,
 * zagueiros, goleiro saltando e a curva completa da bola até a rede!)
 */
export function applyReplayFrameAndCamera(
  frame: ReplayFrameSnapshot,
  progress01: number,
  shotOrigin: THREE.Vector3,
  goalZ: number,
  angle: ReplayCameraAngle,
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

  if (angle === 'TV_BROADCAST') {
    const focusZ = Math.max(-PITCH.HALF_L + 12, Math.min(PITCH.HALF_L - 12, frame.ballPos.z * 0.82));
    camera.position.set(38.5, 20.5, focusZ);
    camera.lookAt(frame.ballPos.x * 0.35, 1.0, frame.ballPos.z * 0.88);
    return;
  }

  if (angle === 'BEHIND_GOAL') {
    const zSign = goalZ < 0 ? -1 : 1;
    camera.position.set(frame.ballPos.x * 0.35, 5.2, goalZ + zSign * 9.5);
    camera.lookAt(frame.ballPos.x * 0.65, 1.4, frame.ballPos.z * 0.7 + goalZ * 0.3);
    return;
  }

  // BEHIND_WIDE: Bem afastada (~16.5m atrás e ~5.8m de altura) p/ enxergar todo o desenho do lance!
  const toGoalX = 0 - shotOrigin.x;
  const toGoalZ = goalZ - shotOrigin.z;
  const distToGoal = Math.max(8, Math.hypot(toGoalX, toGoalZ));
  const dirX = toGoalX / distToGoal;
  const dirZ = toGoalZ / distToGoal;

  const perpX = -dirZ * (shotOrigin.x >= 0 ? 2.6 : -2.6);
  const perpZ = dirX * (shotOrigin.x >= 0 ? 2.6 : -2.6);

  const dollyAdvance = progress01 * Math.min(4.5, distToGoal * 0.16);
  const camX = Math.max(
    -PITCH.HALF_W - 7,
    Math.min(PITCH.HALF_W + 7, shotOrigin.x - dirX * (16.5 - dollyAdvance) + perpX),
  );
  const camZ = Math.max(
    -PITCH.HALF_L - 7,
    Math.min(PITCH.HALF_L + 7, shotOrigin.z - dirZ * (16.5 - dollyAdvance) + perpZ),
  );
  const camY = 5.8 - progress01 * 0.6;

  camera.position.set(camX, camY, camZ);
  camera.lookAt(
    frame.ballPos.x * 0.68,
    Math.max(1.0, Math.min(2.5, frame.ballPos.y * 0.65 + 0.7)),
    frame.ballPos.z * 0.65 + goalZ * 0.35,
  );
}
