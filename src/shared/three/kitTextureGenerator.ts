import * as THREE from 'three';
import { ClubData } from '../../data/clubs/types';
import { CareerPlayer } from '../../domains/player/playerTypes';

function hexLum(hex: string): number {
  const c = hex.replace('#', '');
  if (c.length !== 6) return 0.5;
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function readableTextOn(bgHex: string): string {
  return hexLum(bgHex) > 0.6 ? '#101218' : '#F8FAFC';
}

function makeCanvasTex(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Rosto expressivo estilo Blocky Arcade (fiel à referência):
 * Sobrancelhas retangulares marcantes, olhos verticais limpos, sorriso confiante/focado e barba em blocos!
 */
export function createArcadeFaceTexture(player: CareerPlayer): THREE.CanvasTexture {
  const { appearance } = player;
  const cv = document.createElement('canvas');
  cv.width = 512;
  cv.height = 512;
  const ctx = cv.getContext('2d')!;

  ctx.fillStyle = appearance.skinTone;
  ctx.fillRect(0, 0, 512, 512);

  // Sombra suave na base do queixo e testa para dar volume 3D
  ctx.fillStyle = 'rgba(0,0,0,0.06)';
  ctx.fillRect(0, 448, 512, 64);

  // Se o cabelo for loiro claro/platinado, usa castanho escuro nas sobrancelhas igual à referência!
  const browCol = hexLum(appearance.hairColor) > 0.55 ? '#2A1B12' : appearance.hairColor;
  const expr = appearance.expression ?? 'CONFIANTE';

  // Sobrancelhas grossas retangulares
  ctx.fillStyle = browCol;
  ctx.save();
  ctx.translate(178, 174);
  ctx.rotate(expr === 'FOCADO' ? 0.08 : expr === 'MARRENTO' ? -0.12 : -0.04);
  ctx.fillRect(-48, -14, 96, 26);
  ctx.restore();

  ctx.save();
  ctx.translate(334, 174);
  ctx.rotate(expr === 'FOCADO' ? -0.08 : expr === 'MARRENTO' ? 0.06 : 0.04);
  ctx.fillRect(-48, -14, 96, 26);
  ctx.restore();

  // Olhos verticais limpos estilo Toy/Blocky Soccer
  const eyeBase = '#141110';
  for (const ex of [184, 328]) {
    ctx.fillStyle = eyeBase;
    ctx.fillRect(ex - 21, 214, 42, 82);
    // Brilho sutil da cor da íris na base do olho
    ctx.fillStyle = appearance.eyeColor || '#3B2F2F';
    ctx.fillRect(ex - 15, 272, 30, 18);
  }

  // Barba / Bigode em blocos limpos
  const beard = appearance.facialHair ?? 'LIMPO';
  const beardCol = hexLum(appearance.hairColor) > 0.65 ? '#3A281C' : appearance.hairColor;
  ctx.fillStyle = beardCol;

  if (beard === 'BARBA_CHEIA') {
    ctx.globalAlpha = 0.92;
    ctx.fillRect(46, 336, 420, 145);
    ctx.clearRect(156, 342, 200, 56);
    ctx.fillStyle = appearance.skinTone;
    ctx.fillRect(156, 342, 200, 56);
    ctx.fillStyle = beardCol;
    ctx.fillRect(166, 322, 180, 24);
    ctx.globalAlpha = 1;
  } else if (beard === 'BARBA_BAIXA') {
    ctx.globalAlpha = 0.45;
    ctx.fillRect(60, 355, 392, 120);
    ctx.fillStyle = appearance.skinTone;
    ctx.globalAlpha = 1;
    ctx.fillRect(162, 345, 188, 52);
    ctx.fillStyle = beardCol;
    ctx.globalAlpha = 0.65;
    ctx.fillRect(176, 326, 160, 18);
    ctx.globalAlpha = 1;
  } else if (beard === 'CAVANHAQUE') {
    ctx.fillRect(178, 322, 156, 20);
    ctx.fillRect(196, 408, 120, 58);
  } else if (beard === 'BIGODE') {
    ctx.fillRect(174, 324, 164, 22);
  }

  // Expressão da Boca (fiel à referência!)
  ctx.strokeStyle = '#1A110E';
  ctx.lineWidth = 13;
  ctx.lineCap = 'round';

  if (expr === 'CONFIANTE') {
    ctx.beginPath();
    ctx.moveTo(212, 366);
    ctx.quadraticCurveTo(262, 394, 304, 356);
    ctx.stroke();
    // Tracinho lateral de sorriso confiante igual ao boneco branco da referência!
    ctx.beginPath();
    ctx.moveTo(298, 346);
    ctx.lineTo(314, 364);
    ctx.stroke();
  } else if (expr === 'ALEGRE') {
    ctx.fillStyle = '#1A110E';
    ctx.fillRect(198, 352, 116, 46);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(208, 358, 96, 18);
  } else if (expr === 'MARRENTO') {
    ctx.beginPath();
    ctx.moveTo(214, 370);
    ctx.lineTo(298, 358);
    ctx.stroke();
  }
  // 'FOCADO' deixa sem boca aparente igual ao boneco loiro da direita na referência!

  return makeCanvasTex(cv);
}

export function createArcadeJerseyFrontTexture(
  player: CareerPlayer,
  natTeam: ClubData,
): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = 512;
  cv.height = 512;
  const ctx = cv.getContext('2d')!;

  const c1 = natTeam.primaryColor || '#F5F5F7';
  const c2 = natTeam.secondaryColor || '#111827';
  const trim = c2.toUpperCase() === c1.toUpperCase() ? '#C8A45D' : c2;

  ctx.fillStyle = c1;
  ctx.fillRect(0, 0, 512, 512);

  // Listras clássicas para seleções listradas (ex: Argentina, Paraguai) ou linhas laterais estilo Real Madrid!
  const stripedNations = new Set(['ARG', 'PAR', 'URU_ALT', 'CRO', 'NGA']);
  if (stripedNations.has(player.nationality)) {
    ctx.fillStyle = trim;
    for (const sx of [64, 176, 288, 400]) {
      ctx.fillRect(sx, 0, 48, 512);
    }
  } else {
    // Linhas curvas esportivas na frente igual à camisa branca da referência!
    ctx.strokeStyle = trim;
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.moveTo(92, 512);
    ctx.lineTo(92, 120);
    ctx.quadraticCurveTo(92, 54, 175, 44);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(420, 512);
    ctx.lineTo(420, 120);
    ctx.quadraticCurveTo(420, 54, 337, 44);
    ctx.stroke();
  }

  // Gola esportiva em contraste no topo
  ctx.fillStyle = trim;
  ctx.fillRect(166, 0, 180, 34);

  // Marca esportiva minimalista no lado direito do peito (esquerda da imagem)
  ctx.fillStyle = readableTextOn(c1);
  ctx.beginPath();
  ctx.moveTo(158, 132);
  ctx.lineTo(188, 176);
  ctx.lineTo(128, 176);
  ctx.closePath();
  ctx.fill();

  // Escudo oficial estilizado da Seleção no peito esquerdo (direita da imagem)
  ctx.fillStyle = trim;
  ctx.strokeStyle = '#C8A45D';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(352, 154, 36, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = readableTextOn(trim);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '900 24px "Barlow Condensed", sans-serif';
  ctx.fillText(natTeam.shortName.slice(0, 3), 352, 155);

  return makeCanvasTex(cv);
}

export function createArcadeJerseyBackTexture(
  player: CareerPlayer,
  natTeam: ClubData,
): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = 512;
  cv.height = 512;
  const ctx = cv.getContext('2d')!;

  const c1 = natTeam.primaryColor || '#F5F5F7';
  const c2 = natTeam.secondaryColor || '#111827';
  const trim = c2.toUpperCase() === c1.toUpperCase() ? '#C8A45D' : c2;
  const txtCol = readableTextOn(c1);
  const outlineCol = txtCol === '#101218' ? '#FFFFFF' : '#101218';

  ctx.fillStyle = c1;
  ctx.fillRect(0, 0, 512, 512);

  ctx.fillStyle = trim;
  ctx.fillRect(156, 0, 200, 28);

  const name = (player.shirtName || 'PRO').slice(0, 11).toUpperCase();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '800 58px "Barlow Condensed", sans-serif';
  ctx.lineWidth = 8;
  ctx.strokeStyle = outlineCol;
  ctx.fillStyle = txtCol;
  ctx.strokeText(name, 256, 112);
  ctx.fillText(name, 256, 112);

  ctx.font = '900 250px "Barlow Condensed", sans-serif';
  ctx.lineWidth = 12;
  ctx.strokeText(String(player.shirtNumber), 256, 308);
  ctx.fillText(String(player.shirtNumber), 256, 308);

  return makeCanvasTex(cv);
}

/**
 * Textura das 3 listras esportivas de ombro/manga e lateral do calção (idêntica à referência!)
 */
export function createThreeStripesTexture(baseHex: string, stripeHex: string): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = 256;
  cv.height = 256;
  const ctx = cv.getContext('2d')!;

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, 256, 256);

  const sCol = stripeHex.toUpperCase() === baseHex.toUpperCase() ? readableTextOn(baseHex) : stripeHex;
  ctx.fillStyle = sCol;
  for (const x of [92, 120, 148]) {
    ctx.fillRect(x, 0, 16, 256);
  }
  return makeCanvasTex(cv);
}
