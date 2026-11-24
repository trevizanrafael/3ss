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
  | 'FAKE_SHOT'
  | 'SLIDE'
  | 'CELEBRATE'
  | 'GK_READY'
  | 'GK_SPREAD_LOW'
  | 'GK_DIVE_LEFT'
  | 'GK_DIVE_RIGHT';

export interface PitchActorInstance {
  root: THREE.Group;
  rig: AnimatedRigHandles;
  walkPhase: number;
  runBlend: number;
  dispose: () => void;
}

export function createPitchFootballerActor(
  player: CareerPlayer,
  kitTeam: ClubData,
): PitchActorInstance {
  const built = buildBlockyArcadeFootballer3D(player, kitTeam);

  built.root.children.forEach((child) => {
    if (child !== built.rig.character) {
      child.visible = false;
    }
  });

  built.rig.character.position.y = 0;

  return {
    ...built,
    walkPhase: 0,
    runBlend: 0,
  };
}

export function animatePitchActor(
  actor: PitchActorInstance,
  pose: PitchPoseState,
  speedMetersPerSec: number,
  charge01: number,
  useLeftFoot: boolean,
  dt: number,
  timeSec: number,
): void {
  const { rig } = actor;
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
    rig.leftLegPivot.rotation.set(Math.sin(timeSec * 6.5) * 0.35, 0, 0);
    rig.rightLegPivot.rotation.set(-Math.sin(timeSec * 6.5) * 0.35, 0, 0);
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
    rig.leftLegPivot.rotation.set(0.18, 0, 0);
    rig.rightLegPivot.rotation.set(-0.12, 0, 0);
    return;
  }

  // GOLEIRO SAINDO DE BASE / AJOELHADO EM CRUZ 1x1 (fecha chute rasteiro e abre espaço pra Cavadinha LB+B!)
  if (pose === 'GK_SPREAD_LOW') {
    if (speedMetersPerSec > 0.2) {
      actor.walkPhase = (actor.walkPhase + dt * (7.0 + speedMetersPerSec * 1.2)) % (Math.PI * 2);
    }
    const stepOsc = speedMetersPerSec > 0.2 ? Math.sin(actor.walkPhase) * 0.22 : 0;
    ch.position.y = -0.34 + Math.abs(stepOsc) * 0.04;
    ch.rotation.x = 0.24;
    rig.headPivot.rotation.set(-0.2, 0, 0);
    // Braços bem abertos em cruz baixa fechando os cantos rasteiros
    rig.leftArmPivot.rotation.set(-0.25, 0, -1.18);
    rig.rightArmPivot.rotation.set(-0.25, 0, 1.18);
    rig.leftForearmPivot.rotation.x = -0.22;
    rig.rightForearmPivot.rotation.x = -0.22;
    // Uma perna ajoelhada atrás e outra aberta em espacate/barreira!
    rig.leftLegPivot.rotation.set(-0.78 + stepOsc, 0, -0.45);
    rig.rightLegPivot.rotation.set(0.62 - stepOsc, 0, 0.38);
    return;
  }

  // GOLEIRO NA BASE COM PASSADA LATERAL REAL (nunca desliza estático!)
  if (pose === 'GK_READY') {
    if (speedMetersPerSec > 0.14) {
      const stepFreq = 7.5 + Math.min(7.5, speedMetersPerSec * 1.5);
      actor.walkPhase = (actor.walkPhase + dt * stepFreq) % (Math.PI * 2);
      const cyc = actor.walkPhase;
      const stepAmp = Math.min(0.58, 0.18 + speedMetersPerSec * 0.09);

      // Quique real de passada lateral do goleiro
      ch.position.y = -0.06 + Math.abs(Math.sin(cyc)) * 0.055;
      ch.rotation.x = 0.16;
      rig.headPivot.rotation.set(-0.12, 0, 0);
      rig.leftArmPivot.rotation.set(-0.48 + Math.sin(cyc) * 0.18, 0, -0.62);
      rig.rightArmPivot.rotation.set(-0.48 - Math.sin(cyc) * 0.18, 0, 0.62);
      rig.leftForearmPivot.rotation.x = -0.55;
      rig.rightForearmPivot.rotation.x = -0.55;
      // Pernas abrindo e fechando na passada lateral + avanço!
      rig.leftLegPivot.rotation.set(
        -0.18 + Math.sin(cyc) * stepAmp * 0.7,
        0,
        -0.16 - Math.max(0, Math.sin(cyc)) * stepAmp * 0.65,
      );
      rig.rightLegPivot.rotation.set(
        -0.18 - Math.sin(cyc) * stepAmp * 0.7,
        0,
        0.16 + Math.max(0, -Math.sin(cyc)) * stepAmp * 0.65,
      );
      return;
    }

    const pulse = Math.sin(timeSec * 5.0);
    ch.position.y = -0.05 + Math.abs(pulse) * 0.022;
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
    rig.leftLegPivot.rotation.set(-0.65, 0, 0);
    rig.rightLegPivot.rotation.set(0.45, 0, 0);
    rig.leftArmPivot.rotation.set(0.4, 0, -0.7);
    rig.rightArmPivot.rotation.set(0.4, 0, 0.7);
    return;
  }

  // ANIMAÇÃO DE FINGIR CHUTE + PENTEADA DE SOLA (B depois A)!
  // charge01 aqui recebe o progresso 0..1 da finta: primeiro ameaça o chute, depois penteia de lado!
  if (pose === 'FAKE_SHOT') {
    const p = Math.max(0, Math.min(1, charge01));
    if (p < 0.38) {
      // Fase 1: Ameaça a bomba puxando a perna e inclinando o tronco!
      const k = p / 0.38;
      ch.position.y = 0.02;
      ch.rotation.x = 0.16 * k;
      if (useLeftFoot) {
        rig.leftLegPivot.rotation.set(0.85 * k, 0, -0.08);
        rig.rightLegPivot.rotation.set(-0.25 * k, 0, 0.06);
      } else {
        rig.rightLegPivot.rotation.set(0.85 * k, 0, 0.08);
        rig.leftLegPivot.rotation.set(-0.25 * k, 0, -0.06);
      }
      rig.leftArmPivot.rotation.set(-0.4, 0, -0.65);
      rig.rightArmPivot.rotation.set(0.4, 0, 0.65);
    } else {
      // Fase 2: Freia o pé no ar e passa a sola por cima da bola dando a penteada pro lado!
      const sweep = Math.sin(((p - 0.38) / 0.62) * Math.PI);
      ch.position.y = -0.03 * sweep;
      ch.rotation.z = (useLeftFoot ? 1 : -1) * 0.18 * sweep;
      ch.rotation.x = 0.12;
      if (useLeftFoot) {
        rig.leftLegPivot.rotation.set(-0.55 * sweep, 0, 0.52 * sweep);
        rig.rightLegPivot.rotation.set(0.18 * sweep, 0, 0.1);
      } else {
        rig.rightLegPivot.rotation.set(-0.55 * sweep, 0, -0.52 * sweep);
        rig.leftLegPivot.rotation.set(0.18 * sweep, 0, -0.1);
      }
      rig.leftArmPivot.rotation.set(0.25 * sweep, 0, -0.55);
      rig.rightArmPivot.rotation.set(-0.25 * sweep, 0, 0.55);
    }
    return;
  }

  if (pose === 'CHARGE') {
    const pull = 0.44 + charge01 * 0.84;
    ch.position.y = 0;
    ch.rotation.x = 0.12 * charge01;
    if (useLeftFoot) {
      rig.leftLegPivot.rotation.set(pull, 0, -0.05);
      rig.rightLegPivot.rotation.set(-0.22, 0, 0.04);
    } else {
      rig.rightLegPivot.rotation.set(pull, 0, 0.05);
      rig.leftLegPivot.rotation.set(-0.22, 0, -0.04);
    }
    rig.leftArmPivot.rotation.set(-0.35, 0, -0.52);
    rig.rightArmPivot.rotation.set(0.35, 0, 0.52);
    return;
  }

  if (pose === 'KICK') {
    ch.position.y = 0.04;
    ch.rotation.x = -0.16;
    if (useLeftFoot) {
      rig.leftLegPivot.rotation.set(-1.18, 0, 0.14);
      rig.rightLegPivot.rotation.set(0.25, 0, 0.04);
    } else {
      rig.rightLegPivot.rotation.set(-1.18, 0, -0.14);
      rig.leftLegPivot.rotation.set(0.25, 0, -0.04);
    }
    rig.leftArmPivot.rotation.set(0.45, 0, -0.65);
    rig.rightArmPivot.rotation.set(-0.55, 0, 0.65);
    return;
  }

  const targetBlend = Math.min(1, Math.max(0, (speedMetersPerSec - 0.15) / 1.65));
  actor.runBlend += (targetBlend - actor.runBlend) * Math.min(1, 12 * dt);

  if (actor.runBlend > 0.02) {
    const freq = 6.2 + Math.min(8.2, speedMetersPerSec * 0.92);
    actor.walkPhase = (actor.walkPhase + dt * freq) % (Math.PI * 2);
    const cyc = actor.walkPhase;
    const amp = Math.min(0.95, 0.22 + speedMetersPerSec * 0.075) * actor.runBlend;

    ch.position.y = Math.abs(Math.sin(cyc)) * 0.052 * actor.runBlend;
    ch.rotation.x = Math.min(0.24, speedMetersPerSec * 0.023) * actor.runBlend;
    rig.headPivot.rotation.set(-ch.rotation.x * 0.6, 0, 0);

    rig.leftLegPivot.rotation.set(Math.sin(cyc) * amp, 0, -0.02);
    rig.rightLegPivot.rotation.set(-Math.sin(cyc) * amp, 0, 0.02);

    rig.leftArmPivot.rotation.set(-Math.sin(cyc) * amp * 0.85, 0, -0.25);
    rig.rightArmPivot.rotation.set(Math.sin(cyc) * amp * 0.85, 0, 0.25);
    rig.leftForearmPivot.rotation.x = -0.3 - 0.38 * actor.runBlend;
    rig.rightForearmPivot.rotation.x = -0.3 - 0.38 * actor.runBlend;
    return;
  }

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
