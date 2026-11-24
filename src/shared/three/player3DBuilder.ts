import * as THREE from 'three';
import { getNationalTeamByCountry } from '../../data/clubs';
import { CareerPlayer } from '../../domains/player/playerTypes';
import {
  createBackKitPrintTexture,
  createFrontKitPrintTexture,
} from './kitTextureGenerator';

function stdMat(color: string, roughness = 0.62, metalness = 0.06): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function buildHairGroup(
  style: CareerPlayer['appearance']['hairStyle'],
  hairHex: string,
  hasHeadband: boolean,
  accentHex: string,
): THREE.Group {
  const g = new THREE.Group();
  const hairMat = stdMat(hairHex, 0.78, 0.02);

  if (style === 'RASPADO') {
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.114, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.54),
      stdMat(hairHex, 0.9, 0),
    );
    cap.position.y = 0.015;
    cap.scale.set(0.95, 1.02, 1.02);
    g.add(cap);
  } else if (style === 'DEGRADE' || style === 'CURTO' || style === 'TOPETE') {
    const baseCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.117, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.52),
      hairMat,
    );
    baseCap.position.y = 0.02;
    baseCap.scale.set(style === 'DEGRADE' ? 0.91 : 0.97, 1.04, 1.03);
    g.add(baseCap);

    // Volume superior modelado
    const topCrown = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.055, 0.19), hairMat);
    topCrown.position.set(0, style === 'TOPETE' ? 0.122 : 0.108, style === 'TOPETE' ? 0.018 : 0.005);
    topCrown.rotation.x = style === 'TOPETE' ? -0.16 : -0.05;
    g.add(topCrown);
  } else if (style === 'AFRO') {
    const afro = new THREE.Mesh(new THREE.SphereGeometry(0.152, 24, 20), hairMat);
    afro.position.set(0, 0.065, -0.01);
    afro.scale.set(1.04, 0.98, 1.05);
    g.add(afro);
  } else if (style === 'TRANCA') {
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.118, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.55),
      hairMat,
    );
    cap.position.y = 0.018;
    g.add(cap);
    for (let i = -3; i <= 3; i++) {
      const braid = new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.12, 6, 8), hairMat);
      braid.position.set(i * 0.026, 0.02, -0.095 - Math.abs(i) * 0.004);
      braid.rotation.x = 0.22;
      g.add(braid);
    }
  } else if (style === 'LONGO') {
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.122, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.62),
      hairMat,
    );
    cap.position.y = 0.02;
    g.add(cap);
    const backFlow = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.122, 0.17, 18), hairMat);
    backFlow.position.set(0, -0.035, -0.035);
    g.add(backFlow);
  }

  if (hasHeadband) {
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(0.118, 0.118, 0.028, 28, 1, true),
      stdMat(accentHex, 0.45, 0.1),
    );
    band.position.y = 0.052;
    band.material.side = THREE.DoubleSide;
    g.add(band);
  }

  return g;
}

function buildHeadAndFace(player: CareerPlayer, accentHex: string): THREE.Group {
  const { appearance } = player;
  const headGroup = new THREE.Group();
  const skinMat = stdMat(appearance.skinTone, 0.56, 0.02);
  const hairDarkMat = stdMat(appearance.hairColor, 0.8, 0.02);

  // Crânio + Mandíbula atlética esculpida (sem cabeça redonda de bola!)
  const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.112, 28, 24), skinMat);
  cranium.scale.set(0.93, 1.08, 0.98);
  cranium.position.y = 0.02;
  headGroup.add(cranium);

  const jaw = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.062, 0.105, 20), skinMat);
  jaw.scale.set(0.95, 1, 0.94);
  jaw.position.set(0, -0.042, 0.012);
  headGroup.add(jaw);

  // Orelhas
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 12), skinMat);
    ear.scale.set(0.45, 1.15, 0.75);
    ear.position.set(side * 0.103, 0.002, -0.005);
    headGroup.add(ear);
  }

  // Nariz esculpido
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.017, 0.048, 8), skinMat);
  nose.position.set(0, -0.004, 0.108);
  nose.rotation.x = 0.28;
  headGroup.add(nose);

  // Olhos nítidos (esclera + íris na cor escolhida + pupila) + Sobrancelhas
  const scleraMat = stdMat('#F8FAFC', 0.25, 0.05);
  const irisMat = stdMat(appearance.eyeColor || '#3B2F2F', 0.2, 0.1);
  const pupilMat = stdMat('#090A0D', 0.1, 0.1);

  for (const side of [-1, 1]) {
    const x = side * 0.038;
    const sclera = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.013, 0.01), scleraMat);
    sclera.position.set(x, 0.022, 0.098);
    headGroup.add(sclera);

    const iris = new THREE.Mesh(new THREE.BoxGeometry(0.013, 0.012, 0.012), irisMat);
    iris.position.set(x, 0.022, 0.100);
    headGroup.add(iris);

    const pupil = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.007, 0.014), pupilMat);
    pupil.position.set(x, 0.022, 0.101);
    headGroup.add(pupil);

    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.007, 0.012), hairDarkMat);
    brow.position.set(x, 0.038, 0.101);
    brow.rotation.z = side * -0.06;
    headGroup.add(brow);
  }

  // Barba / Pelos faciais opcionais
  const beard = appearance.facialHair ?? 'LIMPO';
  if (beard === 'CAVANHAQUE' || beard === 'BARBA_BAIXA' || beard === 'BARBA_CHEIA') {
    const mustache = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.009, 0.014), hairDarkMat);
    mustache.position.set(0, -0.032, 0.098);
    headGroup.add(mustache);

    const chinPatch = new THREE.Mesh(
      new THREE.BoxGeometry(
        beard === 'CAVANHAQUE' ? 0.044 : 0.118,
        beard === 'BARBA_CHEIA' ? 0.052 : 0.032,
        beard === 'CAVANHAQUE' ? 0.025 : 0.095,
      ),
      hairDarkMat,
    );
    chinPatch.position.set(0, -0.072, beard === 'CAVANHAQUE' ? 0.082 : 0.035);
    headGroup.add(chinPatch);
  } else {
    const mouthLine = new THREE.Mesh(
      new THREE.BoxGeometry(0.034, 0.005, 0.008),
      stdMat('#7C4A3A', 0.6, 0),
    );
    mouthLine.position.set(0, -0.046, 0.096);
    headGroup.add(mouthLine);
  }

  headGroup.add(
    buildHairGroup(
      appearance.hairStyle,
      appearance.hairColor,
      appearance.accessory === 'FAIXA_CABECA',
      accentHex,
    ),
  );

  return headGroup;
}

export function buildStylizedFootballer3D(player: CareerPlayer): {
  root: THREE.Group;
  dispose: () => void;
} {
  const root = new THREE.Group();
  const natTeam = getNationalTeamByCountry(player.nationality);
  const kitPrimary = natTeam.primaryColor || '#16181D';
  const kitSecondary = natTeam.secondaryColor || '#C8A45D';
  const shortsHex =
    kitSecondary.toUpperCase() === kitPrimary.toUpperCase() ? '#111318' : kitSecondary;

  const { appearance } = player;
  const skinMat = stdMat(appearance.skinTone, 0.56, 0.02);
  const jerseyMat = stdMat(kitPrimary, 0.58, 0.04);
  const shortsMat = stdMat(shortsHex, 0.62, 0.04);
  const trimMat = stdMat('#C8A45D', 0.35, 0.35);
  const bootMat = stdMat(appearance.bootColor || '#C8A45D', 0.32, 0.22);

  // Pedestal tático de estádio + bola oficial ao lado
  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.56, 0.62, 0.06, 40),
    stdMat('#101217', 0.4, 0.3),
  );
  pedestal.position.y = -0.03;
  root.add(pedestal);

  const turfDisc = new THREE.Mesh(
    new THREE.CylinderGeometry(0.52, 0.52, 0.015, 40),
    stdMat('#133321', 0.85, 0.02),
  );
  turfDisc.position.y = 0.005;
  root.add(turfDisc);

  const goldRing = new THREE.Mesh(
    new THREE.RingGeometry(0.50, 0.525, 48),
    new THREE.MeshBasicMaterial({ color: '#C8A45D', side: THREE.DoubleSide }),
  );
  goldRing.rotation.x = -Math.PI / 2;
  goldRing.position.y = 0.014;
  root.add(goldRing);

  const ball = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.105, 1),
    new THREE.MeshStandardMaterial({ color: '#F5F5F7', roughness: 0.35, metalness: 0.08 }),
  );
  ball.position.set(0.28, 0.115, 0.16);
  root.add(ball);

  // Grupo Anatômico escalado por Altura (165..196cm) e Peso/Porte (60..92kg)
  const body = new THREE.Group();
  const hScale = player.heightCm / 178;
  const wScale = 0.88 + ((player.weightKg - 60) / 32) * 0.24;
  body.scale.set(wScale, hScale, wScale);
  root.add(body);

  const sockMode = appearance.sockHeight ?? 'PADRAO';
  const sockH = sockMode === 'ALTO' ? 0.38 : sockMode === 'BAIXO' ? 0.22 : 0.31;

  // Pernas, Meiões, Tornozeleira, Calção e Chuteiras com Travas
  for (const side of [-1, 1]) {
    const legX = side * 0.105;

    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.102, 0.072, 0.235), bootMat);
    boot.position.set(legX, 0.048, 0.045);
    body.add(boot);

    const sole = new THREE.Mesh(
      new THREE.BoxGeometry(0.106, 0.018, 0.24),
      stdMat('#0B0B0D', 0.4, 0.3),
    );
    sole.position.set(legX, 0.014, 0.045);
    body.add(sole);

    // Panturrilha em pele + Meião sobreposto
    const calf = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.046, 0.40, 18), skinMat);
    calf.position.set(legX, 0.27, 0);
    body.add(calf);

    const sock = new THREE.Mesh(new THREE.CylinderGeometry(0.064, 0.049, sockH, 18), jerseyMat);
    sock.position.set(legX, 0.08 + sockH / 2, 0);
    body.add(sock);

    const sockStripe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.065, 0.065, 0.025, 18),
      shortsMat,
    );
    sockStripe.position.set(legX, 0.08 + sockH - 0.02, 0);
    body.add(sockStripe);

    if (appearance.accessory === 'TORNOZELEIRA') {
      const tape = new THREE.Mesh(
        new THREE.CylinderGeometry(0.053, 0.051, 0.055, 16),
        stdMat('#F5F5F7', 0.7, 0),
      );
      tape.position.set(legX, 0.11, 0);
      body.add(tape);
    }

    // Coxa + Perna do Calção
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.064, 0.34, 18), skinMat);
    thigh.position.set(legX, 0.62, 0);
    body.add(thigh);

    const shortLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.088, 0.24, 18), shortsMat);
    shortLeg.position.set(legX, 0.72, 0);
    body.add(shortLeg);
  }

  // Pelvis do Calção
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.37, 0.16, 0.21), shortsMat);
  pelvis.position.set(0, 0.84, 0);
  body.add(pelvis);

  // Tronco Atlético em V (Peito largo + cintura definida)
  const lowerTorso = new THREE.Mesh(new THREE.CylinderGeometry(0.185, 0.162, 0.25, 22), jerseyMat);
  lowerTorso.scale.set(1.06, 1, 0.68);
  lowerTorso.position.set(0, 1.00, 0);
  body.add(lowerTorso);

  const upperChest = new THREE.Mesh(new THREE.CylinderGeometry(0.215, 0.185, 0.30, 24), jerseyMat);
  upperChest.scale.set(1.08, 1, 0.68);
  upperChest.position.set(0, 1.25, 0);
  body.add(upperChest);

  if (appearance.shirtTuck === 'SOLTA') {
    const untuckedHem = new THREE.Mesh(new THREE.CylinderGeometry(0.168, 0.172, 0.07, 22), jerseyMat);
    untuckedHem.scale.set(1.07, 1, 0.72);
    untuckedHem.position.set(0, 0.87, 0);
    body.add(untuckedHem);
  }

  // Gola da Camisa
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.078, 0.014, 10, 24), shortsMat);
  collar.rotation.x = Math.PI / 2;
  collar.position.set(0, 1.40, 0.01);
  body.add(collar);

  // Estampa Dinâmica Peito + Nome e Número nas Costas!
  const frontTex = createFrontKitPrintTexture(
    natTeam.shortName,
    player.shirtNumber,
    kitPrimary,
    kitSecondary,
  );
  const backTex = createBackKitPrintTexture(
    player.shirtName,
    player.shirtNumber,
    kitPrimary,
    kitSecondary,
  );

  const frontDecal = new THREE.Mesh(
    new THREE.PlaneGeometry(0.30, 0.34),
    new THREE.MeshStandardMaterial({ map: frontTex, transparent: true, roughness: 0.55 }),
  );
  frontDecal.position.set(0, 1.21, 0.149);
  body.add(frontDecal);

  const backDecal = new THREE.Mesh(
    new THREE.PlaneGeometry(0.31, 0.38),
    new THREE.MeshStandardMaterial({ map: backTex, transparent: true, roughness: 0.55 }),
  );
  backDecal.position.set(0, 1.19, -0.149);
  backDecal.rotation.y = Math.PI;
  body.add(backDecal);

  // Ombros, Braços, Mangas (Curta / Longa / Térmica) e Acessórios (Munhequeira / Luvas)
  for (const side of [-1, 1]) {
    const armPivot = new THREE.Group();
    armPivot.position.set(side * 0.245, 1.35, 0);
    armPivot.rotation.z = side * -0.14;
    armPivot.rotation.x = 0.05;
    body.add(armPivot);

    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.068, 16, 14), jerseyMat);
    armPivot.add(shoulder);

    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.064, 0.056, 0.18, 16), jerseyMat);
    sleeve.position.y = -0.09;
    armPivot.add(sleeve);

    const forearmMat =
      appearance.sleeveStyle === 'LONGA'
        ? jerseyMat
        : appearance.sleeveStyle === 'TERMICA'
          ? stdMat('#111318', 0.5, 0.05)
          : skinMat;

    const fullArm = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.039, 0.36, 16), forearmMat);
    fullArm.position.y = -0.29;
    armPivot.add(fullArm);

    if (appearance.accessory === 'MUNHEQUEIRA') {
      const wrist = new THREE.Mesh(
        new THREE.CylinderGeometry(0.044, 0.043, 0.05, 16),
        stdMat('#F5F5F7', 0.6, 0),
      );
      wrist.position.y = -0.44;
      armPivot.add(wrist);
    }

    const handMat = appearance.accessory === 'LUVAS' ? stdMat('#111318', 0.4, 0.1) : skinMat;
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.075, 0.062), handMat);
    hand.position.y = -0.50;
    armPivot.add(hand);
  }

  // Pescoço + Cabeça Esculpida
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.064, 0.11, 18), skinMat);
  neck.position.set(0, 1.44, 0);
  body.add(neck);

  const head = buildHeadAndFace(player, kitSecondary === '#FFFFFF' ? '#C8A45D' : kitSecondary);
  head.position.set(0, 1.565, 0.01);
  body.add(head);

  // Marca sutil dourada no pedestal frontal
  const frontPlaque = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.025, 0.02), trimMat);
  frontPlaque.position.set(0, 0.002, 0.56);
  root.add(frontPlaque);

  return {
    root,
    dispose: () => {
      frontTex.dispose();
      backTex.dispose();
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
