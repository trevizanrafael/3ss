import * as THREE from 'three';
import { ClubData } from '../../data/clubs/types';
import { CompetitionTheme } from '../../data/world/competitionThemes';
import { PITCH } from '../physics/pitchConstants';

export interface Stadium3DHandles {
  root: THREE.Group;
  ballMesh: THREE.Mesh;
  targetRingLeft: THREE.Mesh;
  targetRingRight: THREE.Mesh;
  updateDynamicElements: (
    timeSec: number,
    netRipple: number,
    netHitPoint: THREE.Vector3,
    celebrating: boolean,
    showCornerTargets: boolean,
  ) => void;
  dispose: () => void;
}

function createStripedPitchTexture(): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = 1024;
  cv.height = 2048;
  const ctx = cv.getContext('2d')!;

  // 14 faixas de corte de grama estilo estádio noturno europeu/sul-americano
  const stripes = 14;
  const bandH = cv.height / stripes;
  for (let i = 0; i < stripes; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#23823F' : '#1D6F35';
    ctx.fillRect(0, i * bandH, cv.width, bandH + 1);
  }

  // Ruído sutil de grama
  ctx.fillStyle = 'rgba(255,255,255,0.025)';
  for (let i = 0; i < 4000; i++) {
    ctx.fillRect(Math.random() * cv.width, Math.random() * cv.height, 2, 3);
  }

  // Escala de coordenadas metros -> pixels (margem externa de 4m inclusa na malha de 64x92)
  const totalW = PITCH.WIDTH + 8; // 64
  const totalL = PITCH.LENGTH + 8; // 92
  const mx = (xMeters: number) => ((xMeters + totalW / 2) / totalW) * cv.width;
  const mz = (zMeters: number) => ((zMeters + totalL / 2) / totalL) * cv.height;

  ctx.strokeStyle = 'rgba(248, 250, 252, 0.92)';
  ctx.fillStyle = 'rgba(248, 250, 252, 0.92)';
  ctx.lineWidth = 5;

  // Linhas laterais e de fundo
  const x0 = mx(-PITCH.HALF_W);
  const x1 = mx(PITCH.HALF_W);
  const z0 = mz(-PITCH.HALF_L);
  const z1 = mz(PITCH.HALF_L);
  ctx.strokeRect(x0, z0, x1 - x0, z1 - z0);

  // Linha do meio-campo e círculo central
  const zMid = mz(0);
  ctx.beginPath();
  ctx.moveTo(x0, zMid);
  ctx.lineTo(x1, zMid);
  ctx.stroke();

  const rPx = (7.8 / totalW) * cv.width;
  ctx.beginPath();
  ctx.arc(mx(0), zMid, rPx, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(mx(0), zMid, 6, 0, Math.PI * 2);
  ctx.fill();

  // Grandes áreas, pequenas áreas, marcas de pênalti e meia-luas (Norte e Sul)
  for (const dir of [-1, 1]) {
    const zGoal = dir * PITCH.HALF_L;
    const zBox = dir * (PITCH.HALF_L - PITCH.PENALTY_BOX_D);
    const zSix = dir * (PITCH.HALF_L - PITCH.SIX_YARD_D);
    const zPen = dir * (PITCH.HALF_L - 10.5);

    const bx0 = mx(-PITCH.PENALTY_BOX_W / 2);
    const bx1 = mx(PITCH.PENALTY_BOX_W / 2);
    ctx.strokeRect(bx0, Math.min(mz(zGoal), mz(zBox)), bx1 - bx0, Math.abs(mz(zBox) - mz(zGoal)));

    const sx0 = mx(-PITCH.SIX_YARD_W / 2);
    const sx1 = mx(PITCH.SIX_YARD_W / 2);
    ctx.strokeRect(sx0, Math.min(mz(zGoal), mz(zSix)), sx1 - sx0, Math.abs(mz(zSix) - mz(zGoal)));

    ctx.beginPath();
    ctx.arc(mx(0), mz(zPen), 5.5, 0, Math.PI * 2);
    ctx.fill();

    // Meia-lua fora da grande área
    ctx.beginPath();
    if (dir === -1) {
      ctx.arc(mx(0), mz(zPen), rPx * 0.92, 0.22 * Math.PI, 0.78 * Math.PI);
    } else {
      ctx.arc(mx(0), mz(zPen), rPx * 0.92, 1.22 * Math.PI, 1.78 * Math.PI);
    }
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createMatchBallTexture(accentColor: string): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = 256;
  cv.height = 256;
  const ctx = cv.getContext('2d')!;

  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, 256, 256);

  // Gomos clássicos pentagonais escuros + detalhe na cor da liga para leitura nítida do giro no ar!
  ctx.fillStyle = '#111827';
  for (const [cx, cy, r] of [
    [64, 64, 28],
    [192, 64, 28],
    [128, 128, 30],
    [64, 192, 28],
    [192, 192, 28],
  ] as const) {
    ctx.beginPath();
    for (let k = 0; k < 5; k++) {
      const ang = (k * Math.PI * 2) / 5 - Math.PI / 2;
      const px = cx + Math.cos(ang) * r;
      const py = cy + Math.sin(ang) * r;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }

  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(0, 128);
  ctx.lineTo(256, 128);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createAdboardTexture(club: ClubData, theme: CompetitionTheme): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = 1024;
  cv.height = 128;
  const ctx = cv.getContext('2d')!;

  ctx.fillStyle = '#0D1017';
  ctx.fillRect(0, 0, 1024, 128);
  ctx.fillStyle = theme.accentPrimary;
  ctx.fillRect(0, 0, 1024, 10);
  ctx.fillRect(0, 118, 1024, 10);

  ctx.font = '900 44px "Barlow Condensed", sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#F8FAFC';
  ctx.fillText(`★ THREE STARS SOCCER`, 36, 66);
  ctx.fillStyle = theme.accentPrimary;
  ctx.fillText(theme.shortLabel, 430, 66);
  ctx.fillStyle = '#F8FAFC';
  ctx.fillText(`• ${club.name.toUpperCase()}`, 735, 66);

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.repeat.set(3, 1);
  return tex;
}

function buildGoalWithDeformableNet(zSign: -1 | 1): {
  group: THREE.Group;
  backNetGeo: THREE.PlaneGeometry;
  basePositions: Float32Array;
} {
  const group = new THREE.Group();
  const gz = zSign * PITCH.HALF_L;
  const hw = PITCH.GOAL_HALF_W;
  const gh = PITCH.GOAL_HEIGHT;
  const depth = PITCH.GOAL_DEPTH;
  const pr = PITCH.POST_RADIUS;

  const postMat = new THREE.MeshStandardMaterial({
    color: '#F8FAFC',
    roughness: 0.25,
    metalness: 0.35,
  });
  const supportMat = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.5 });

  // 2 Traves verticais + Travessão
  for (const sx of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(pr, pr, gh, 16), postMat);
    post.position.set(sx * hw, gh / 2, gz);
    group.add(post);

    const backBar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, gh, 10), supportMat);
    backBar.position.set(sx * hw, gh / 2, gz + zSign * depth);
    group.add(backBar);
  }

  const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(pr, pr, hw * 2 + pr * 2, 16), postMat);
  crossbar.rotation.z = Math.PI / 2;
  crossbar.position.set(0, gh, gz);
  group.add(crossbar);

  // Malha de Rede Traseira subdividida para estufar fisicamente quando a bola bate!
  const netMat = new THREE.MeshBasicMaterial({
    color: '#E2E8F0',
    wireframe: true,
    transparent: true,
    opacity: 0.48,
  });

  const backNetGeo = new THREE.PlaneGeometry(hw * 2, gh, 18, 10);
  const backNet = new THREE.Mesh(backNetGeo, netMat);
  backNet.position.set(0, gh / 2, gz + zSign * depth);
  group.add(backNet);

  const sideNetGeo = new THREE.PlaneGeometry(depth, gh, 8, 8);
  for (const sx of [-1, 1]) {
    const sideNet = new THREE.Mesh(sideNetGeo, netMat);
    sideNet.rotation.y = Math.PI / 2;
    sideNet.position.set(sx * hw, gh / 2, gz + (zSign * depth) / 2);
    group.add(sideNet);
  }

  const topNetGeo = new THREE.PlaneGeometry(hw * 2, depth, 14, 6);
  const topNet = new THREE.Mesh(topNetGeo, netMat);
  topNet.rotation.x = Math.PI / 2;
  topNet.position.set(0, gh, gz + (zSign * depth) / 2);
  group.add(topNet);

  const basePositions = new Float32Array(backNetGeo.attributes.position.array);
  return { group, backNetGeo, basePositions };
}

export function buildStadium3D(club: ClubData, theme: CompetitionTheme): Stadium3DHandles {
  const root = new THREE.Group();
  const textures: THREE.Texture[] = [];
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  // 1. Gramado Listrado Oficial + Margem Externa
  const pitchTex = createStripedPitchTexture();
  textures.push(pitchTex);
  const pitchGeo = new THREE.PlaneGeometry(PITCH.WIDTH + 8, PITCH.LENGTH + 8);
  const pitchMat = new THREE.MeshStandardMaterial({ map: pitchTex, roughness: 0.88 });
  geometries.push(pitchGeo);
  materials.push(pitchMat);

  const pitchMesh = new THREE.Mesh(pitchGeo, pitchMat);
  pitchMesh.rotation.x = -Math.PI / 2;
  pitchMesh.receiveShadow = true;
  root.add(pitchMesh);

  // Piso escuro ao redor do gramado até as arquibancadas
  const surroundGeo = new THREE.PlaneGeometry(140, 165);
  const surroundMat = new THREE.MeshStandardMaterial({ color: '#111622', roughness: 0.92 });
  geometries.push(surroundGeo);
  materials.push(surroundMat);
  const surround = new THREE.Mesh(surroundGeo, surroundMat);
  surround.rotation.x = -Math.PI / 2;
  surround.position.y = -0.02;
  root.add(surround);

  // 2. Gols Norte (-Z) e Sul (+Z) com Redes Deformáveis
  const northGoal = buildGoalWithDeformableNet(-1);
  const southGoal = buildGoalWithDeformableNet(1);
  root.add(northGoal.group);
  root.add(southGoal.group);

  // Alvos Luminosos nos 2 Ângulos Superiores (Gaveta!) para Treino / Seletiva
  const ringGeo = new THREE.TorusGeometry(0.68, 0.065, 12, 28);
  const ringMat = new THREE.MeshBasicMaterial({ color: '#FACC15' });
  geometries.push(ringGeo);
  materials.push(ringMat);

  const targetRingLeft = new THREE.Mesh(ringGeo, ringMat);
  targetRingLeft.position.set(-PITCH.GOAL_HALF_W + 0.85, PITCH.GOAL_HEIGHT - 0.78, -PITCH.HALF_L + 0.05);
  const targetRingRight = new THREE.Mesh(ringGeo, ringMat);
  targetRingRight.position.set(PITCH.GOAL_HALF_W - 0.85, PITCH.GOAL_HEIGHT - 0.78, -PITCH.HALF_L + 0.05);
  root.add(targetRingLeft, targetRingRight);

  // 3. Placas Publicitárias LED ao redor do campo
  const adTex = createAdboardTexture(club, theme);
  textures.push(adTex);
  const adMat = new THREE.MeshStandardMaterial({
    map: adTex,
    emissive: '#111827',
    roughness: 0.4,
  });
  materials.push(adMat);

  const sideAdGeo = new THREE.BoxGeometry(0.25, 0.95, PITCH.LENGTH + 2);
  geometries.push(sideAdGeo);
  for (const sx of [-1, 1]) {
    const ad = new THREE.Mesh(sideAdGeo, adMat);
    ad.position.set(sx * (PITCH.HALF_W + 3.2), 0.48, 0);
    root.add(ad);
  }

  // 4. Arquibancadas de Estádio Estilo Blocky-Arcade + Torcida InstancedMesh (1 Draw Call = 120 FPS!)
  const standMat = new THREE.MeshStandardMaterial({ color: '#162033', roughness: 0.75 });
  const roofMat = new THREE.MeshStandardMaterial({ color: '#0E1726', roughness: 0.55 });
  materials.push(standMat, roofMat);

  const fanGeo = new THREE.BoxGeometry(0.46, 0.72, 0.42);
  const fanMat = new THREE.MeshLambertMaterial({ color: '#FFFFFF' });
  geometries.push(fanGeo);
  materials.push(fanMat);

  const fanPositions: { x: number; baseY: number; z: number; phase: number; color: THREE.Color }[] = [];
  const colPrimary = new THREE.Color(club.primaryColor || '#E11D48');
  const colSecondary = new THREE.Color(club.secondaryColor || '#F8FAFC');
  const colNeutral = new THREE.Color('#1E293B');

  // Arquibancadas Norte, Sul, Leste e Oeste em degraus
  for (let tier = 0; tier < 6; tier++) {
    const y = 1.1 + tier * 1.15;
    const offset = 5.5 + tier * 1.65;

    // Degraus Norte & Sul
    const nsStep = new THREE.Mesh(
      new THREE.BoxGeometry(PITCH.WIDTH + 14, 1.2, 1.7),
      standMat,
    );
    nsStep.position.set(0, y - 0.4, -(PITCH.HALF_L + offset));
    root.add(nsStep);

    const sStep = nsStep.clone();
    sStep.position.z = PITCH.HALF_L + offset;
    root.add(sStep);

    // Degraus Leste & Oeste
    const ewStep = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 1.2, PITCH.LENGTH + 10),
      standMat,
    );
    ewStep.position.set(-(PITCH.HALF_W + offset), y - 0.4, 0);
    root.add(ewStep);

    const eStep = ewStep.clone();
    eStep.position.x = PITCH.HALF_W + offset;
    root.add(eStep);

    // Popula torcedores nos degraus
    for (let x = -28; x <= 28; x += 1.65) {
      for (const zSign of [-1, 1]) {
        const roll = Math.random();
        const col = roll < 0.52 ? colPrimary : roll < 0.82 ? colSecondary : colNeutral;
        fanPositions.push({
          x: x + (Math.random() - 0.5) * 0.4,
          baseY: y + 0.45,
          z: zSign * (PITCH.HALF_L + offset),
          phase: Math.random() * Math.PI * 2,
          color: col,
        });
      }
    }
    for (let z = -38; z <= 38; z += 1.85) {
      for (const xSign of [-1, 1]) {
        const roll = Math.random();
        const col = roll < 0.52 ? colPrimary : roll < 0.82 ? colSecondary : colNeutral;
        fanPositions.push({
          x: xSign * (PITCH.HALF_W + offset),
          baseY: y + 0.45,
          z: z + (Math.random() - 0.5) * 0.4,
          phase: Math.random() * Math.PI * 2,
          color: col,
        });
      }
    }
  }

  const crowdInstanced = new THREE.InstancedMesh(fanGeo, fanMat, fanPositions.length);
  const dummy = new THREE.Object3D();
  fanPositions.forEach((fp, idx) => {
    dummy.position.set(fp.x, fp.baseY, fp.z);
    dummy.lookAt(0, 0, 0);
    dummy.updateMatrix();
    crowdInstanced.setMatrixAt(idx, dummy.matrix);
    crowdInstanced.setColorAt(idx, fp.color);
  });
  crowdInstanced.instanceMatrix.needsUpdate = true;
  if (crowdInstanced.instanceColor) crowdInstanced.instanceColor.needsUpdate = true;
  root.add(crowdInstanced);

  // 4 Torres de Refletores Luminosos de Estádio Noturno (igual à arte de referência!)
  const towerPoleMat = new THREE.MeshStandardMaterial({ color: '#1E293B', roughness: 0.5 });
  const lampGlowMat = new THREE.MeshBasicMaterial({ color: '#FFFBEB' });
  materials.push(towerPoleMat, lampGlowMat);

  for (const [tx, tz] of [
    [-38, -52],
    [38, -52],
    [-38, 52],
    [38, 52],
  ] as const) {
    const pole = new THREE.Mesh(new THREE.BoxGeometry(1.1, 24, 1.1), towerPoleMat);
    pole.position.set(tx, 12, tz);
    root.add(pole);

    const panel = new THREE.Mesh(new THREE.BoxGeometry(4.8, 2.8, 0.6), lampGlowMat);
    panel.position.set(tx, 24.2, tz);
    panel.lookAt(0, 0, 0);
    root.add(panel);
  }

  // 5. Bola Oficial 3D
  const ballTex = createMatchBallTexture(theme.accentPrimary);
  textures.push(ballTex);
  const ballGeo = new THREE.SphereGeometry(PITCH.BALL_RADIUS, 24, 24);
  const ballMat = new THREE.MeshStandardMaterial({
    map: ballTex,
    roughness: 0.35,
    metalness: 0.05,
  });
  geometries.push(ballGeo);
  materials.push(ballMat);
  const ballMesh = new THREE.Mesh(ballGeo, ballMat);
  ballMesh.castShadow = true;
  ballMesh.position.set(0, PITCH.BALL_RADIUS, -14);
  root.add(ballMesh);

  let lastCelebrationState = false;

  const updateDynamicElements = (
    timeSec: number,
    netRipple: number,
    netHitPoint: THREE.Vector3,
    celebrating: boolean,
    showCornerTargets: boolean,
  ) => {
    targetRingLeft.visible = showCornerTargets;
    targetRingRight.visible = showCornerTargets;
    if (showCornerTargets) {
      const s = 1 + Math.sin(timeSec * 5) * 0.07;
      targetRingLeft.scale.setScalar(s);
      targetRingRight.scale.setScalar(s);
    }

    // Deforma a rede do gol Norte/Sul suavemente quando a bola estufa a malha!
    for (const [goalObj, sign] of [
      [northGoal, -1],
      [southGoal, 1],
    ] as const) {
      const posAttr = goalObj.backNetGeo.attributes.position as THREE.BufferAttribute;
      const base = goalObj.basePositions;
      const isThisGoal = sign === -1 ? netHitPoint.z < 0 : netHitPoint.z > 0;

      if (netRipple > 0.01 && isThisGoal) {
        const wave = Math.sin(timeSec * 28) * 0.35 + 0.65;
        for (let i = 0; i < posAttr.count; i++) {
          const vx = base[i * 3];
          const vy = base[i * 3 + 1] + PITCH.GOAL_HEIGHT / 2;
          const dist = Math.hypot(vx - netHitPoint.x, vy - netHitPoint.y);
          const falloff = Math.max(0, 1 - dist / 3.4);
          posAttr.setZ(i, base[i * 3 + 2] + sign * falloff * netRipple * 0.95 * wave);
        }
        posAttr.needsUpdate = true;
      } else if (posAttr.getZ(Math.floor(posAttr.count / 2)) !== 0) {
        for (let i = 0; i < posAttr.count; i++) {
          posAttr.setZ(i, base[i * 3 + 2]);
        }
        posAttr.needsUpdate = true;
      }
    }

    // Torcida pulando na arquibancada durante comemoração de gol!
    if (celebrating || lastCelebrationState) {
      lastCelebrationState = celebrating;
      fanPositions.forEach((fp, idx) => {
        const jump = celebrating ? Math.abs(Math.sin(timeSec * 9 + fp.phase)) * 0.36 : 0;
        dummy.position.set(fp.x, fp.baseY + jump, fp.z);
        dummy.lookAt(0, 0, 0);
        dummy.updateMatrix();
        crowdInstanced.setMatrixAt(idx, dummy.matrix);
      });
      crowdInstanced.instanceMatrix.needsUpdate = true;
    }
  };

  return {
    root,
    ballMesh,
    targetRingLeft,
    targetRingRight,
    updateDynamicElements,
    dispose: () => {
      textures.forEach((t) => t.dispose());
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}
