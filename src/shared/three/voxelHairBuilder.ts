import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { HairStyleCode } from '../../domains/player/playerTypes';

export function makeBeveledBox(
  w: number,
  h: number,
  d: number,
  radius = 0.014,
  segments = 3,
): RoundedBoxGeometry {
  const geo = new RoundedBoxGeometry(w, h, d, segments, radius);
  // Corrige os 6 grupos de materiais (+X, -X, +Y, -Y, +Z, -Z) após o toNonIndexed interno
  geo.clearGroups();
  const vertsPerSide = geo.attributes.position.count / 6;
  for (let s = 0; s < 6; s++) {
    geo.addGroup(s * vertsPerSide, vertsPerSide, s);
  }
  return geo;
}

/**
 * Esculpe os 10 estilos de cabelo Blocky Arcade sobre a cabeça 0.34 x 0.34 x 0.30
 * (sentado acima das sobrancelhas em y >= +0.14, sem nunca tapar os olhos!).
 */
export function buildBlockyHairMesh(
  style: HairStyleCode,
  hairHex: string,
  hasHeadband: boolean,
  bandHex: string,
): THREE.Group {
  const g = new THREE.Group();
  const hairMat = new THREE.MeshStandardMaterial({
    color: hairHex,
    roughness: 0.52,
    metalness: 0.04,
  });

  const addBlock = (
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    r = 0.014,
    rotZ = 0,
    rotX = 0,
  ) => {
    const m = new THREE.Mesh(makeBeveledBox(w, h, d, r, 2), hairMat);
    m.position.set(x, y, z);
    m.rotation.z = rotZ;
    m.rotation.x = rotX;
    g.add(m);
  };

  if (style === 'RASPADO') {
    const buzzMat = new THREE.MeshStandardMaterial({
      color: hairHex,
      roughness: 0.85,
      transparent: true,
      opacity: 0.65,
    });
    const cap = new THREE.Mesh(makeBeveledBox(0.344, 0.032, 0.304, 0.01, 2), buzzMat);
    cap.position.set(0, 0.168, -0.002);
    g.add(cap);
  } else if (style === 'DEGRADE') {
    // Idêntico ao jogador de camisa branca da referência (tampa chanfrada na régua + risquinho central!)
    addBlock(0.172, 0.068, 0.312, -0.09, 0.184, 0.002, 0.014);
    addBlock(0.172, 0.068, 0.312, 0.09, 0.184, 0.002, 0.014);
    addBlock(0.346, 0.052, 0.06, 0, 0.145, -0.132, 0.01);
  } else if (style === 'ARREPIADO') {
    // Idêntico ao jogador loiro da direita na referência (coroa + 5 mechas esculpidas na franja!)
    addBlock(0.348, 0.062, 0.28, 0, 0.18, -0.012, 0.014);
    const spikes = [-0.125, -0.062, 0, 0.062, 0.125];
    spikes.forEach((sx, idx) => {
      const sh = idx % 2 === 0 ? 0.082 : 0.068;
      addBlock(0.052, sh, 0.075, sx, 0.188, 0.128, 0.012, (idx - 2) * -0.04, -0.12);
    });
  } else if (style === 'TOPETE') {
    addBlock(0.344, 0.065, 0.285, 0, 0.182, -0.01, 0.014);
    addBlock(0.31, 0.088, 0.12, 0.015, 0.215, 0.105, 0.018, -0.06, -0.18);
  } else if (style === 'CURTO') {
    addBlock(0.22, 0.072, 0.314, -0.062, 0.186, 0.002, 0.016);
    addBlock(0.125, 0.056, 0.312, 0.112, 0.178, 0.002, 0.014);
    // Costeletas laterais e nuca clássica
    addBlock(0.032, 0.11, 0.16, -0.168, 0.115, -0.04, 0.008);
    addBlock(0.032, 0.11, 0.16, 0.168, 0.115, -0.04, 0.008);
    addBlock(0.344, 0.14, 0.045, 0, 0.10, -0.142, 0.012);
  } else if (style === 'AFRO') {
    addBlock(0.43, 0.21, 0.38, 0, 0.235, -0.005, 0.038);
    addBlock(0.39, 0.13, 0.22, 0, 0.14, -0.075, 0.028);
  } else if (style === 'TRANCA') {
    // Tranças no topo + dreads caindo atrás e nas laterais
    for (const tx of [-0.13, -0.065, 0, 0.065, 0.13]) {
      addBlock(0.048, 0.065, 0.315, tx, 0.184, 0, 0.014);
      addBlock(0.044, 0.22, 0.052, tx, 0.075, -0.155, 0.012, 0, 0.08);
    }
    for (const side of [-1, 1]) {
      addBlock(0.042, 0.17, 0.05, side * 0.176, 0.10, -0.05, 0.012);
      addBlock(0.042, 0.15, 0.05, side * 0.176, 0.11, 0.02, 0.012);
    }
  } else if (style === 'MOICANO') {
    addBlock(0.342, 0.03, 0.302, 0, 0.166, 0, 0.008);
    addBlock(0.105, 0.125, 0.33, 0, 0.225, 0.01, 0.018);
    addBlock(0.095, 0.18, 0.075, 0, 0.11, -0.155, 0.014);
  } else if (style === 'COQUE') {
    addBlock(0.346, 0.066, 0.308, 0, 0.184, -0.004, 0.016);
    addBlock(0.342, 0.11, 0.042, 0, 0.12, -0.14, 0.01);
    // Coque samurai preso atrás
    addBlock(0.12, 0.11, 0.11, 0, 0.215, -0.175, 0.024);
  } else if (style === 'LONGO') {
    addBlock(0.362, 0.075, 0.32, 0, 0.188, 0, 0.018);
    addBlock(0.368, 0.31, 0.075, 0, 0.035, -0.145, 0.018);
    addBlock(0.052, 0.27, 0.19, -0.174, 0.045, -0.045, 0.016);
    addBlock(0.052, 0.27, 0.19, 0.174, 0.045, -0.045, 0.016);
  }

  if (hasHeadband) {
    const bandMat = new THREE.MeshStandardMaterial({
      color: bandHex,
      roughness: 0.42,
      metalness: 0.05,
    });
    const band = new THREE.Mesh(makeBeveledBox(0.354, 0.044, 0.314, 0.008, 2), bandMat);
    band.position.set(0, 0.128, 0.002);
    g.add(band);
  }

  return g;
}
