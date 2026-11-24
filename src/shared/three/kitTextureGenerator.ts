import * as THREE from 'three';

function getReadableKitTextColor(hexBg: string): string {
  const clean = hexBg.replace('#', '');
  if (clean.length !== 6) return '#F5F5F7';
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.62 ? '#0B0B0D' : '#F5F5F7';
}

export function createBackKitPrintTexture(
  shirtName: string,
  shirtNumber: number,
  primaryHex: string,
  secondaryHex: string,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 512, 512);
  const textCol = getReadableKitTextColor(primaryHex);
  const strokeCol = textCol === '#0B0B0D' ? '#FFFFFF' : '#0B0B0D';

  // Nome nas costas estilo camisa oficial
  const cleanName = (shirtName || 'PRO').slice(0, 12).toUpperCase();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '800 54px "Barlow Condensed", "Arial Narrow", sans-serif';
  ctx.lineWidth = 6;
  ctx.strokeStyle = strokeCol;
  ctx.fillStyle = textCol;
  ctx.strokeText(cleanName, 256, 96);
  ctx.fillText(cleanName, 256, 96);

  // Detalhe fino na cor secundária sob o nome
  ctx.fillStyle = secondaryHex;
  ctx.fillRect(156, 134, 200, 6);

  // Número grande oficial nas costas
  const numStr = String(shirtNumber);
  ctx.font = '900 250px "Barlow Condensed", "Impact", sans-serif';
  ctx.lineWidth = 12;
  ctx.strokeStyle = strokeCol;
  ctx.fillStyle = textCol;
  ctx.strokeText(numStr, 256, 305);
  ctx.fillText(numStr, 256, 305);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createFrontKitPrintTexture(
  shortCode: string,
  shirtNumber: number,
  primaryHex: string,
  secondaryHex: string,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 512, 512);
  const textCol = getReadableKitTextColor(primaryHex);

  // Faixa sutil de peito estilo seleção
  ctx.fillStyle = secondaryHex;
  ctx.globalAlpha = 0.88;
  ctx.fillRect(48, 150, 416, 16);
  ctx.globalAlpha = 1;

  // Escudo geométrico da Federação no peito esquerdo (lado direito do canvas visto de frente)
  ctx.fillStyle = secondaryHex;
  ctx.strokeStyle = '#C8A45D';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(335, 62);
  ctx.lineTo(405, 62);
  ctx.lineTo(405, 112);
  ctx.lineTo(370, 142);
  ctx.lineTo(335, 112);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = getReadableKitTextColor(secondaryHex);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '800 26px "Barlow Condensed", sans-serif';
  ctx.fillText(shortCode.slice(0, 3).toUpperCase(), 370, 98);

  // Número frontal de Seleção no peito
  ctx.fillStyle = textCol;
  ctx.font = '900 108px "Barlow Condensed", sans-serif';
  ctx.fillText(String(shirtNumber), 152, 106);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}
