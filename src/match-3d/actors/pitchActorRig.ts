import * as THREE from 'three';
import { ClubData } from '../../data/clubs/types';
import { CareerPlayer } from '../../domains/player/playerTypes';
import {
  AnimatedRigHandles,
  buildBlockyArcadeFootballer3D,
} from '../../shared/three/player3DBuilder';

export type PitchPoseState =
  | 'IDLE'
  | 'RUN'
  | 'CHARGE'
  | 'KICK'
  | 'SLIDE'
  | 'CELEBRATE'
  | 'GK_READY'
  | 'GK_DIVE_LEFT'
  | 'GK_DIVE_RIGHT';

export interface PitchActorInstance {
  root: THREE.Group;
  rig: AnimatedRigHandles;
  dispose: () => void;
}

export function createPitchFootballerActor(
  player: CareerPlayer,
  kitTeam: ClubData,
): PitchActorInstance {
  const built = buildBlockyArcadeFootballer3D(player, kitTeam);

  // Remove o pedestal de menu para que as chuteiras toquem diretamente o gramado (y = 0)!
  built.root.children.forEach((child) => {
    if (child !== built.rig.character) {
      child.visible = false;
    }
  });

  // Ajusta o offset vertical para a sola da chuteira apoiar cravada em y = 0
  built.rig.character.position.y = 0;

  return built;
}

export function animatePitchActor(
  rig: AnimatedRigHandles,
  pose: PitchPoseState,
  speedMetersPerSec: number,
  charge01: number,
  isLeftFooted: boolean,
  timeSec: number,
): void {
  const ch = rig.character;
  ch.rotation.set(0, 0, 0);

  if (pose === 'CELEBRATE') {
    const bounce = Math.abs(Math.sin(timeSec * 6.5));
    ch.position.y = bounce * 0.12;
    rig.headPivot.rotation.set(-0.14, Math.sin(timeSec * 4) * 0.18, 0);
    rig.leftArmPivot.rotation.set(-0.2, 0, -1.35 - bounce * 0.15);
    rig.rightArmPivot.rotation.set(-0.2, 0, 1.35 + bounce * 0.15);
    rig.leftForearmPivot.rotation.x = -0.15;
    rig.rightForearmPivot.rotation.x = -0.15;
    rig.leftLegPivot.rotation.x = Math.sin(timeSec * 6.5) * 0.35;
    rig.rightLegPivot.rotation.x = -Math.sin(timeSec * 6.5) * 0.35;
    return;
  }

  if (pose === 'GK_DIVE_LEFT' || pose === 'GK_DIVE_RIGHT') {
    const sign = pose === 'GK_DIVE_LEFT' ? 1 : -1;
    ch.position.y = 0.42;
    ch.rotation.z = sign * 1.28;
    rig.leftArmPivot.rotation.set(-2.65, 0, -0.25);
    rig.rightArmPivot.rotation.set(-2.65, 0, 0.25);
    rig.leftForearmPivot.rotation.x = -0.1;
    rig.rightForearmPivot.rotation.x = -0.1;
    rig.leftLegPivot.rotation.x = 0.18;
    rig.rightLegPivot.rotation.x = -0.12;
    return;
  }

  if (pose === 'GK_READY') {
    const pulse = Math.sin(timeSec * 5.2);
    ch.position.y = -0.05 + Math.abs(pulse) * 0.025;
    ch.rotation.x = 0.16;
    rig.headPivot.rotation.set(-0.12, 0, 0);
    rig.leftArmPivot.rotation.set(-0.55, 0, -0.62);
    rig.rightArmPivot.rotation.set(-0.55, 0, 0.62);
    rig.leftForearmPivot.rotation.x = -0.55;
    rig.rightForearmPivot.rotation.x = -0.55;
    rig.leftLegPivot.rotation.set(-0.22, 0, -0.14);
    rig.rightLegPivot.rotation.set(-0.22, 0, 0.14);
    return;
  }

  if (pose === 'SLIDE') {
    ch.position.y = -0.32;
    ch.rotation.x = -1.05;
    rig.leftLegPivot.rotation.x = -0.65;
    rig.rightLegPivot.rotation.x = 0.45;
    rig.leftArmPivot.rotation.set(0.4, 0, -0.7);
    rig.rightArmPivot.rotation.set(0.4, 0, 0.7);
    return;
  }

  if (pose === 'CHARGE') {
    const pull = 0.45 + charge01 * 0.85;
    ch.position.y = 0;
    ch.rotation.x = 0.12 * charge01;
    if (isLeftFooted) {
      rig.leftLegPivot.rotation.x = pull;
      rig.rightLegPivot.rotation.x = -0.22;
    } else {
      rig.rightLegPivot.rotation.x = pull;
      rig.leftLegPivot.rotation.x = -0.22;
    }
    rig.leftArmPivot.rotation.set(-0.35, 0, -0.55);
    rig.rightArmPivot.rotation.set(0.35, 0, 0.55);
    return;
  }

  if (pose === 'KICK') {
    ch.position.y = 0.04;
    ch.rotation.x = -0.16;
    if (isLeftFooted) {
      rig.leftLegPivot.rotation.x = -1.18;
      rig.rightLegPivot.rotation.x = 0.25;
    } else {
      rig.rightLegPivot.rotation.x = -1.18;
      rig.leftLegPivot.rotation.x = 0.25;
    }
    rig.leftArmPivot.rotation.set(0.45, 0, -0.65);
    rig.rightArmPivot.rotation.set(-0.55, 0, 0.65);
    return;
  }

  if (pose === 'RUN' || speedMetersPerSec > 0.35) {
    const freq = 7.5 + Math.min(8.5, speedMetersPerSec * 0.85);
    const amp = Math.min(0.95, 0.28 + speedMetersPerSec * 0.075);
    const cyc = timeSec * freq;

    ch.position.y = Math.abs(Math.sin(cyc)) * 0.055;
    ch.rotation.x = Math.min(0.24, speedMetersPerSec * 0.024); // Inclinação atlética no sprint!
    rig.headPivot.rotation.set(-ch.rotation.x * 0.6, 0, 0);

    rig.leftLegPivot.rotation.set(Math.sin(cyc) * amp, 0, -0.02);
    rig.rightLegPivot.rotation.set(-Math.sin(cyc) * amp, 0, 0.02);

    rig.leftArmPivot.rotation.set(-Math.sin(cyc) * amp * 0.85, 0, -0.26);
    rig.rightArmPivot.rotation.set(Math.sin(cyc) * amp * 0.85, 0, 0.26);
    rig.leftForearmPivot.rotation.x = -0.68;
    rig.rightForearmPivot.rotation.x = -0.68;
    return;
  }

  // IDLE respirando em prontidão no gramado
  const breath = Math.sin(timeSec * 2.6);
  ch.position.y = breath * 0.008;
  rig.headPivot.rotation.set(breath * 0.02, Math.sin(timeSec * 1.1) * 0.05, 0);
  rig.leftArmPivot.rotation.set(-0.08, 0, -0.24 - breath * 0.02);
  rig.rightArmPivot.rotation.set(-0.08, 0, 0.24 + breath * 0.02);
  rig.leftForearmPivot.rotation.x = -0.3;
  rig.rightForearmPivot.rotation.x = -0.3;
  rig.leftLegPivot.rotation.set(0, 0, -0.025);
  rig.rightLegPivot.rotation.set(0, 0, 0.025);
}
