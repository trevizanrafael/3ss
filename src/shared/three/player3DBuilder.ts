import * as THREE from 'three';
import { getNationalTeamByCountry } from '../../data/clubs';
import { CareerPlayer } from '../../domains/player/playerTypes';
import {
  createArcadeFaceTexture,
  createArcadeJerseyBackTexture,
  createArcadeJerseyFrontTexture,
  createThreeStripesTexture,
} from './kitTextureGenerator';
import { buildBlockyHairMesh, makeBeveledBox } from './voxelHairBuilder';

export interface AnimatedRigHandles {
  character: THREE.Group;
  headPivot: THREE.Group;
  leftArmPivot: THREE.Group;
  rightArmPivot: THREE.Group;
  leftForearmPivot: THREE.Group;
  rightForearmPivot: THREE.Group;
  leftLegPivot: THREE.Group;
  rightLegPivot: THREE.Group;
}

function mat(color: string, roughness = 0.5, metalness = 0.04): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

export function buildBlockyArcadeFootballer3D(player: CareerPlayer): {
  root: THREE.Group;
  rig: AnimatedRigHandles;
  dispose: () => void;
} {
  const root = new THREE.Group();
  const texturesToDispose: THREE.Texture[] = [];

  const natTeam = getNationalTeamByCountry(player.nationality);
  const kitPrimary = natTeam.primaryColor || '#F5F5F7';
  const kitSecondary = natTeam.secondaryColor || '#111827';
  const accentStripe =
    kitSecondary.toUpperCase() === kitPrimary.toUpperCase() ? '#111827' : kitSecondary;

  // Calção oficial de futebol (branco com branco estilo Real Madrid OU cor secundária oficial!)
  const shortsColor = kitSecondary || '#111827';

  const { appearance } = player;
  const skinMat = mat(appearance.skinTone, 0.52, 0.02);
  const kitMat = mat(kitPrimary, 0.48, 0.04);
  const shortsMat = mat(shortsColor, 0.5, 0.04);
  const stripeMat = mat(accentStripe, 0.45, 0.05);
  const whiteMat = mat('#F8FAFC', 0.45, 0.04);
  const darkThermalMat = mat('#12141A', 0.48, 0.06);
  const bootUpperMat = mat(appearance.bootColor || '#C8A45D', 0.34, 0.16);
  const bootSoleMat = mat('#E2E8F0', 0.38, 0.12);

  // ==================== PEDESTAL DE GRAMADO + BOLA CLÁSSICA ====================
  const basePlate = new THREE.Mesh(
    new THREE.CylinderGeometry(0.62, 0.66, 0.05, 48),
    mat('#101218', 0.4, 0.25),
  );
  basePlate.position.y = -0.025;
  root.add(basePlate);

  const turf = new THREE.Mesh(
    new THREE.CylinderGeometry(0.58, 0.58, 0.02, 48),
    mat('#236E38', 0.82, 0.02),
  );
  turf.position.y = 0.008;
  root.add(turf);

  // Linha branca de cal de campo no pedestal
  const chalkLine = new THREE.Mesh(makeBeveledBox(0.88, 0.006, 0.032, 0.002, 1), whiteMat);
  chalkLine.position.set(0, 0.019, 0.22);
  chalkLine.rotation.y = -0.18;
  root.add(chalkLine);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.565, 0.585, 56),
    new THREE.MeshBasicMaterial({ color: '#C8A45D', side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.02;
  root.add(ring);

  // ==================== PERSONAGEM BLOCKY ARCADE ESCALADO ====================
  const character = new THREE.Group();
  const hScale = player.heightCm / 178;
  const wScale = 0.92 + ((player.weightKg - 60) / 32) * 0.18;
  character.scale.set(wScale, hScale, wScale);
  root.add(character);

  // Texturas de Rosto, Camisa (Frente/Costas) e 3 Listras de Ombro/Calção
  const faceTex = createArcadeFaceTexture(player);
  const frontJerseyTex = createArcadeJerseyFrontTexture(player, natTeam);
  const backJerseyTex = createArcadeJerseyBackTexture(player, natTeam);
  const sleeveStripesTex = createThreeStripesTexture(kitPrimary, accentStripe);
  const shortsStripesTex = createThreeStripesTexture(shortsColor, accentStripe);
  texturesToDispose.push(
    faceTex,
    frontJerseyTex,
    backJerseyTex,
    sleeveStripesTex,
    shortsStripesTex,
  );

  const frontJerseyMat = new THREE.MeshStandardMaterial({ map: frontJerseyTex, roughness: 0.48 });
  const backJerseyMat = new THREE.MeshStandardMaterial({ map: backJerseyTex, roughness: 0.48 });
  const sleeveStripeMat = new THREE.MeshStandardMaterial({ map: sleeveStripesTex, roughness: 0.48 });
  const shortsStripeMat = new THREE.MeshStandardMaterial({ map: shortsStripesTex, roughness: 0.5 });
  const faceFrontMat = new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.52 });

  // ==================== PERNAS ARTICULADAS, CALÇÃO LARGO, MEIÃO LISTRADO E CHUTEIRA ====================
  const legPivots: THREE.Group[] = [];
  const sockMode = appearance.sockHeight ?? 'PADRAO';
  const sockH = sockMode === 'ALTO' ? 0.27 : sockMode === 'BAIXO' ? 0.15 : 0.21;

  // Cós do Calção Esportivo
  const waistShorts = new THREE.Mesh(makeBeveledBox(0.39, 0.11, 0.23, 0.014, 3), shortsMat);
  waistShorts.position.set(0, 0.66, 0);
  character.add(waistShorts);

  for (const side of [-1, 1]) {
    const hipPivot = new THREE.Group();
    hipPivot.position.set(side * 0.105, 0.63, 0);
    hipPivot.rotation.z = side * 0.025;
    character.add(hipPivot);
    legPivots.push(hipPivot);

    // Perna larga do Calção de Futebol com 3 listras na face lateral externa!
    const shortLegMats = [
      side === 1 ? shortsStripeMat : shortsMat, // +X
      side === -1 ? shortsStripeMat : shortsMat, // -X
      shortsMat,
      shortsMat,
      shortsMat,
      shortsMat,
    ];
    const shortLeg = new THREE.Mesh(makeBeveledBox(0.182, 0.21, 0.225, 0.014, 3), shortLegMats);
    shortLeg.position.set(0, -0.095, 0);
    hipPivot.add(shortLeg);

    // Canela chanfrada em pele (estilo quadrado limpo da referência!)
    const shin = new THREE.Mesh(makeBeveledBox(0.124, 0.35, 0.128, 0.012, 3), skinMat);
    shin.position.set(0, -0.34, 0);
    hipPivot.add(shin);

    // Meião em relevo + Punho dobrado com 2 listras em alto-relevo igualzinho à foto!
    const sockMainMat = kitPrimary.toUpperCase() === '#FFFFFF' ? whiteMat : kitMat;
    const sockBody = new THREE.Mesh(makeBeveledBox(0.138, sockH, 0.142, 0.012, 3), sockMainMat);
    sockBody.position.set(0, -0.53 + sockH / 2, 0);
    hipPivot.add(sockBody);

    const cuffY = -0.53 + sockH - 0.024;
    const cuffBase = new THREE.Mesh(makeBeveledBox(0.148, 0.056, 0.152, 0.01, 2), whiteMat);
    cuffBase.position.set(0, cuffY, 0);
    hipPivot.add(cuffBase);

    for (const dy of [-0.013, 0.011]) {
      const stripeRing = new THREE.Mesh(makeBeveledBox(0.151, 0.011, 0.155, 0.003, 1), stripeMat);
      stripeRing.position.set(0, cuffY + dy, 0);
      hipPivot.add(stripeRing);
    }

    if (appearance.accessory === 'TORNOZELEIRA') {
      const ankleTape = new THREE.Mesh(makeBeveledBox(0.144, 0.045, 0.148, 0.008, 2), whiteMat);
      ankleTape.position.set(0, -0.49, 0);
      hipPivot.add(ankleTape);
    }

    // Chuteira Blocky Bicolor (corpo colorido + biqueira levemente destacada + sola clara!)
    const bootGroup = new THREE.Group();
    bootGroup.position.set(0, -0.575, 0.032);
    hipPivot.add(bootGroup);

    const bootUpper = new THREE.Mesh(makeBeveledBox(0.148, 0.078, 0.238, 0.016, 3), bootUpperMat);
    bootUpper.position.y = 0.018;
    bootGroup.add(bootUpper);

    const sole = new THREE.Mesh(makeBeveledBox(0.152, 0.026, 0.244, 0.006, 2), bootSoleMat);
    sole.position.y = -0.026;
    bootGroup.add(sole);
  }

  // ==================== TRONCO / CAMISA OFICIAL ====================
  const torsoMats = [
    kitMat, // +X
    kitMat, // -X
    kitMat, // +Y
    kitMat, // -Y
    frontJerseyMat, // +Z Frente
    backJerseyMat, // -Z Costas
  ];
  const torsoH = appearance.shirtTuck === 'SOLTA' ? 0.49 : 0.44;
  const torsoY = appearance.shirtTuck === 'SOLTA' ? 0.93 : 0.95;
  const torso = new THREE.Mesh(makeBeveledBox(0.41, torsoH, 0.235, 0.018, 3), torsoMats);
  torso.position.set(0, torsoY, 0);
  character.add(torso);

  // Pescoço
  const neck = new THREE.Mesh(makeBeveledBox(0.14, 0.075, 0.13, 0.01, 2), skinMat);
  neck.position.set(0, 1.20, 0);
  character.add(neck);

  // ==================== BRAÇOS ARTICULADOS (OMBRO + MANGA C/ 3 LISTRAS + COTOVELO + MÃO C/ POLEGAR) ====================
  const armPivots: THREE.Group[] = [];
  const forearmPivots: THREE.Group[] = [];

  for (const side of [-1, 1]) {
    const shPivot = new THREE.Group();
    shPivot.position.set(side * 0.235, 1.12, 0);
    shPivot.rotation.z = side * 0.26;
    shPivot.rotation.x = -0.08;
    character.add(shPivot);
    armPivots.push(shPivot);

    // Manga com as 3 listras na face superior/externa igual à camisa branca da referência!
    const sleeveMats = [
      side === 1 ? sleeveStripeMat : kitMat,
      side === -1 ? sleeveStripeMat : kitMat,
      sleeveStripeMat,
      kitMat,
      kitMat,
      kitMat,
    ];
    const sleeve = new THREE.Mesh(makeBeveledBox(0.138, 0.21, 0.142, 0.014, 3), sleeveMats);
    sleeve.position.set(side * 0.035, -0.075, 0);
    shPivot.add(sleeve);

    // Barra da manga curta
    const sleeveCuff = new THREE.Mesh(makeBeveledBox(0.142, 0.024, 0.146, 0.006, 2), stripeMat);
    sleeveCuff.position.set(side * 0.035, -0.175, 0);
    shPivot.add(sleeveCuff);

    // Cotovelo + Antebraço
    const elbowPivot = new THREE.Group();
    elbowPivot.position.set(side * 0.035, -0.185, 0);
    elbowPivot.rotation.x = -0.24;
    shPivot.add(elbowPivot);
    forearmPivots.push(elbowPivot);

    const forearmMat =
      appearance.sleeveStyle === 'LONGA'
        ? kitMat
        : appearance.sleeveStyle === 'TERMICA'
          ? darkThermalMat
          : skinMat;

    const forearm = new THREE.Mesh(makeBeveledBox(0.106, 0.21, 0.108, 0.012, 3), forearmMat);
    forearm.position.set(0, -0.10, 0);
    elbowPivot.add(forearm);

    if (appearance.accessory === 'MUNHEQUEIRA') {
      const wrist = new THREE.Mesh(makeBeveledBox(0.116, 0.044, 0.118, 0.008, 2), whiteMat);
      wrist.position.set(0, -0.185, 0);
      elbowPivot.add(wrist);
    }

    // Mão Blocky + Polegar separado igual à referência!
    const handMat = appearance.accessory === 'LUVAS' ? darkThermalMat : skinMat;
    const palm = new THREE.Mesh(makeBeveledBox(0.104, 0.105, 0.088, 0.014, 2), handMat);
    palm.position.set(0, -0.255, 0.005);
    elbowPivot.add(palm);

    const thumb = new THREE.Mesh(makeBeveledBox(0.038, 0.056, 0.038, 0.008, 2), handMat);
    thumb.position.set(side * -0.052, -0.238, 0.038);
    thumb.rotation.z = side * 0.35;
    elbowPivot.add(thumb);
  }

  // ==================== CABEÇA CHANFRADA + ORELHAS + ROSTO + 10 CABELOS ====================
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 1.39, 0.01);
  character.add(headPivot);

  const headMats = [
    skinMat, // +X
    skinMat, // -X
    skinMat, // +Y
    skinMat, // -Y
    faceFrontMat, // +Z Rosto Expressivo!
    skinMat, // -Z
  ];
  const headCube = new THREE.Mesh(makeBeveledBox(0.34, 0.34, 0.30, 0.022, 3), headMats);
  headPivot.add(headCube);

  // Orelhas chanfradas fofas nas laterais iguais à referência!
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(makeBeveledBox(0.046, 0.088, 0.058, 0.012, 2), skinMat);
    ear.position.set(side * 0.182, -0.01, -0.01);
    headPivot.add(ear);
  }

  const hairGroup = buildBlockyHairMesh(
    appearance.hairStyle,
    appearance.hairColor,
    appearance.accessory === 'FAIXA_CABECA',
    accentStripe,
  );
  headPivot.add(hairGroup);

  return {
    root,
    rig: {
      character,
      headPivot,
      leftArmPivot: armPivots[0],
      rightArmPivot: armPivots[1],
      leftForearmPivot: forearmPivots[0],
      rightForearmPivot: forearmPivots[1],
      leftLegPivot: legPivots[0],
      rightLegPivot: legPivots[1],
    },
    dispose: () => {
      texturesToDispose.forEach((t) => t.dispose());
      root.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
    },
  };
}
