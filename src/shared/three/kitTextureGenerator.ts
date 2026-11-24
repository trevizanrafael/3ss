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

/**
 * Gera a textura UV 1024x1024 da camisa do atleta (Wolf3D_Outfit_Top):
 * - Frente (u ~ 0.267, v ~ 0.60): Escudo da Seleção + Número frontal
 * - Costas (u ~ 0.771, v ~ 0.55..0.72): Nome oficial + Número grande nas costas
 * Como é mapeada direto na malha com SkinnedMesh + NormalMap real de tecido,
 * a camisa dobra e respira naturalmente junto com os ombros do jogador!
 */
export function createUvJerseyTexture(
  shortCode: string,
  shirtName: string,
  shirtNumber: number,
  primaryHex: string,
  secondaryHex: string,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;

  // Base do tecido na cor primária da Seleção
  ctx.fillStyle = primaryHex;
  ctx.fillRect(0, 0, 1024, 1024);

  // Detalhe de gola superior no mapa UV (região superior v < 0.24)
  ctx.fillStyle = secondaryHex;
  ctx.fillRect(0, 0, 1024, 90);

  const textCol = getReadableKitTextColor(primaryHex);
  const strokeCol = textCol === '#0B0B0D' ? 'rgba(255,255,255,0.75)' : 'rgba(11,11,13,0.75)';

  // ================= FRENTE DO PEITO (centro u=0.267 -> x=273, v=0.60 -> y=614) =================
  ctx.fillStyle = secondaryHex;
  ctx.globalAlpha = 0.85;
  ctx.fillRect(175, 650, 196, 10);
  ctx.globalAlpha = 1;

  // Escudo no peito esquerdo do atleta (u ~ 0.31, v ~ 0.58 -> x=318, y=594)
  ctx.fillStyle = secondaryHex;
  ctx.strokeStyle = '#C8A45D';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(304, 574);
  ctx.lineTo(334, 574);
  ctx.lineTo(334, 598);
  ctx.lineTo(319, 612);
  ctx.lineTo(304, 598);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = getReadableKitTextColor(secondaryHex);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '800 11px "Barlow Condensed", sans-serif';
  ctx.fillText(shortCode.slice(0, 3).toUpperCase(), 319, 591);

  // Número pequeno de seleção no peito direito/centro
  ctx.fillStyle = textCol;
  ctx.font = '900 44px "Barlow Condensed", sans-serif';
  ctx.fillText(String(shirtNumber), 232, 596);

  // ================= COSTAS DA CAMISA (centro u=0.771 -> x=790, v=0.55..0.72) =================
  const cleanName = (shirtName || 'PRO').slice(0, 12).toUpperCase();
  ctx.font = '800 32px "Barlow Condensed", "Arial Narrow", sans-serif';
  ctx.lineWidth = 4;
  ctx.strokeStyle = strokeCol;
  ctx.fillStyle = textCol;
  ctx.strokeText(cleanName, 790, 566);
  ctx.fillText(cleanName, 790, 566);

  // Número grande oficial nas costas
  ctx.font = '900 132px "Barlow Condensed", "Impact", sans-serif';
  ctx.lineWidth = 6;
  ctx.strokeText(String(shirtNumber), 790, 668);
  ctx.fillText(String(shirtNumber), 790, 668);

  const tex = new THREE.CanvasTexture(canvas);
  tex.flipY = false; // Padrão obrigatório para malhas glTF!
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Aplica o tom de pele escolhido preservando 100% dos poros, lábios, sobrancelhas,
 * pálpebras e sombreamento anatômico da textura humana real do GLB!
 */
export function createTintedSkinTexture(
  sourceImage: CanvasImageSource,
  targetHex: string,
): THREE.CanvasTexture {
  const w = 512;
  const h = 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(sourceImage, 0, 0, w, h);

  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;

  const clean = targetHex.replace('#', '');
  const tr = parseInt(clean.slice(0, 2), 16);
  const tg = parseInt(clean.slice(2, 4), 16);
  const tb = parseInt(clean.slice(4, 6), 16);

  // Cor base média original da pele no GLB (~218, 172, 146)
  const refR = 216;
  const refG = 170;
  const refB = 144;

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    d[i] = Math.min(255, Math.round((r / refR) * tr));
    d[i + 1] = Math.min(255, Math.round((g / refG) * tg));
    d[i + 2] = Math.min(255, Math.round((b / refB) * tb));
  }

  ctx.putImageData(imgData, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.flipY = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}
