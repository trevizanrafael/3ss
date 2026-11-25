import * as THREE from 'three';
import { ClubData, SquadPosition } from '../../data/clubs/types';
import { PositionCode } from '../../shared/types/common';
import { PITCH } from '../physics/pitchConstants';

export type TacticalFormationId = '4-3-3' | '4-2-3-1' | '4-4-2' | '3-5-2';

export type TacticalLineGroup = 'DEF' | 'MID' | 'FWD';

export interface TacticalSlotSpec {
  slotIndex: number;
  roleLabel: SquadPosition;
  acceptedPositions: SquadPosition[];
  line: TacticalLineGroup;
  /**
   * Posição lateral relativa (-1 = Esquerda de quem ataca, +1 = Direita de quem ataca).
   * Como worldX = relX * (-attackDir) * HALF_W, o PD do mandante encara diretamente o LE do visitante!
   */
  atkRelX: number;
  /** Progresso longitudinal atacando (-1 = próprio gol, 0 = meio-campo, +1 = gol adversário) */
  atkRelProgress: number;
  /** Posição lateral compactada recompondo sem a bola */
  defRelX: number;
  /** Progresso longitudinal recompondo no bloco defensivo */
  defRelProgress: number;
  /** Se verdadeiro, atua como pivô de segurança ("Stay Back" / cobertura contra-ataque) */
  holdingAnchor?: boolean;
  /** Raio máximo de flutuação lateral/vertical em metros */
  freedomRadius: number;
}

export interface TacticalFormationSpec {
  id: TacticalFormationId;
  displayName: string;
  outfieldSlots: TacticalSlotSpec[]; // 10 jogadores de linha (índices 0..9)
}

export const TACTICAL_FORMATIONS: Record<TacticalFormationId, TacticalFormationSpec> = {
  '4-3-3': {
    id: '4-3-3',
    displayName: '4-3-3 POSICIONAL',
    outfieldSlots: [
      {
        slotIndex: 0,
        roleLabel: 'LE',
        acceptedPositions: ['LE', 'ME', 'ZAG'],
        line: 'DEF',
        atkRelX: -0.78,
        atkRelProgress: -0.1,
        defRelX: -0.64,
        defRelProgress: -0.56,
        freedomRadius: 14,
      },
      {
        slotIndex: 1,
        roleLabel: 'ZAG',
        acceptedPositions: ['ZAG', 'VOL', 'LE'],
        line: 'DEF',
        atkRelX: -0.28,
        atkRelProgress: -0.26,
        defRelX: -0.23,
        defRelProgress: -0.6,
        holdingAnchor: true,
        freedomRadius: 9,
      },
      {
        slotIndex: 2,
        roleLabel: 'ZAG',
        acceptedPositions: ['ZAG', 'VOL', 'LD'],
        line: 'DEF',
        atkRelX: 0.28,
        atkRelProgress: -0.26,
        defRelX: 0.23,
        defRelProgress: -0.6,
        holdingAnchor: true,
        freedomRadius: 9,
      },
      {
        slotIndex: 3,
        roleLabel: 'LD',
        acceptedPositions: ['LD', 'MD', 'ZAG'],
        line: 'DEF',
        atkRelX: 0.78,
        atkRelProgress: -0.1,
        defRelX: 0.64,
        defRelProgress: -0.56,
        freedomRadius: 14,
      },
      {
        slotIndex: 4,
        roleLabel: 'VOL',
        acceptedPositions: ['VOL', 'MC', 'ZAG'],
        line: 'MID',
        atkRelX: 0.0,
        atkRelProgress: -0.06,
        defRelX: 0.0,
        defRelProgress: -0.42,
        holdingAnchor: true,
        freedomRadius: 12,
      },
      {
        slotIndex: 5,
        roleLabel: 'MC',
        acceptedPositions: ['MC', 'MEI', 'ME', 'VOL'],
        line: 'MID',
        atkRelX: -0.36,
        atkRelProgress: 0.16,
        defRelX: -0.3,
        defRelProgress: -0.3,
        freedomRadius: 15,
      },
      {
        slotIndex: 6,
        roleLabel: 'MEI',
        acceptedPositions: ['MEI', 'MC', 'MD', 'SA'],
        line: 'MID',
        atkRelX: 0.36,
        atkRelProgress: 0.2,
        defRelX: 0.3,
        defRelProgress: -0.28,
        freedomRadius: 16,
      },
      {
        slotIndex: 7,
        roleLabel: 'PE',
        acceptedPositions: ['PE', 'ME', 'SA', 'ATA'],
        line: 'FWD',
        atkRelX: -0.7,
        atkRelProgress: 0.46,
        defRelX: -0.56,
        defRelProgress: -0.1,
        freedomRadius: 17,
      },
      {
        slotIndex: 8,
        roleLabel: 'ATA',
        acceptedPositions: ['ATA', 'SA', 'PE', 'PD'],
        line: 'FWD',
        atkRelX: 0.0,
        atkRelProgress: 0.56,
        defRelX: 0.0,
        defRelProgress: 0.06,
        freedomRadius: 16,
      },
      {
        slotIndex: 9,
        roleLabel: 'PD',
        acceptedPositions: ['PD', 'MD', 'SA', 'ATA'],
        line: 'FWD',
        atkRelX: 0.7,
        atkRelProgress: 0.46,
        defRelX: 0.56,
        defRelProgress: -0.1,
        freedomRadius: 17,
      },
    ],
  },

  '4-2-3-1': {
    id: '4-2-3-1',
    displayName: '4-2-3-1 EQUILIBRADO',
    outfieldSlots: [
      {
        slotIndex: 0,
        roleLabel: 'LE',
        acceptedPositions: ['LE', 'ME', 'ZAG'],
        line: 'DEF',
        atkRelX: -0.76,
        atkRelProgress: -0.12,
        defRelX: -0.64,
        defRelProgress: -0.57,
        freedomRadius: 14,
      },
      {
        slotIndex: 1,
        roleLabel: 'ZAG',
        acceptedPositions: ['ZAG', 'VOL'],
        line: 'DEF',
        atkRelX: -0.27,
        atkRelProgress: -0.28,
        defRelX: -0.23,
        defRelProgress: -0.61,
        holdingAnchor: true,
        freedomRadius: 9,
      },
      {
        slotIndex: 2,
        roleLabel: 'ZAG',
        acceptedPositions: ['ZAG', 'VOL'],
        line: 'DEF',
        atkRelX: 0.27,
        atkRelProgress: -0.28,
        defRelX: 0.23,
        defRelProgress: -0.61,
        holdingAnchor: true,
        freedomRadius: 9,
      },
      {
        slotIndex: 3,
        roleLabel: 'LD',
        acceptedPositions: ['LD', 'MD', 'ZAG'],
        line: 'DEF',
        atkRelX: 0.76,
        atkRelProgress: -0.12,
        defRelX: 0.64,
        defRelProgress: -0.57,
        freedomRadius: 14,
      },
      {
        slotIndex: 4,
        roleLabel: 'VOL',
        acceptedPositions: ['VOL', 'MC', 'ZAG'],
        line: 'MID',
        atkRelX: -0.24,
        atkRelProgress: -0.05,
        defRelX: -0.22,
        defRelProgress: -0.41,
        holdingAnchor: true,
        freedomRadius: 12,
      },
      {
        slotIndex: 5,
        roleLabel: 'MC',
        acceptedPositions: ['MC', 'VOL', 'MEI'],
        line: 'MID',
        atkRelX: 0.24,
        atkRelProgress: 0.02,
        defRelX: 0.22,
        defRelProgress: -0.39,
        freedomRadius: 14,
      },
      {
        slotIndex: 6,
        roleLabel: 'PE',
        acceptedPositions: ['PE', 'ME', 'MEI', 'SA'],
        line: 'FWD',
        atkRelX: -0.68,
        atkRelProgress: 0.36,
        defRelX: -0.58,
        defRelProgress: -0.18,
        freedomRadius: 16,
      },
      {
        slotIndex: 7,
        roleLabel: 'MEI',
        acceptedPositions: ['MEI', 'SA', 'MC', 'ATA'],
        line: 'MID',
        atkRelX: 0.0,
        atkRelProgress: 0.31,
        defRelX: 0.0,
        defRelProgress: -0.12,
        freedomRadius: 17,
      },
      {
        slotIndex: 8,
        roleLabel: 'PD',
        acceptedPositions: ['PD', 'MD', 'MEI', 'SA'],
        line: 'FWD',
        atkRelX: 0.68,
        atkRelProgress: 0.36,
        defRelX: 0.58,
        defRelProgress: -0.18,
        freedomRadius: 16,
      },
      {
        slotIndex: 9,
        roleLabel: 'ATA',
        acceptedPositions: ['ATA', 'SA', 'PE', 'PD'],
        line: 'FWD',
        atkRelX: 0.0,
        atkRelProgress: 0.56,
        defRelX: 0.0,
        defRelProgress: 0.08,
        freedomRadius: 16,
      },
    ],
  },

  '4-4-2': {
    id: '4-4-2',
    displayName: '4-4-2 DUAS LINHAS',
    outfieldSlots: [
      {
        slotIndex: 0,
        roleLabel: 'LE',
        acceptedPositions: ['LE', 'ME', 'ZAG'],
        line: 'DEF',
        atkRelX: -0.75,
        atkRelProgress: -0.15,
        defRelX: -0.64,
        defRelProgress: -0.58,
        freedomRadius: 13,
      },
      {
        slotIndex: 1,
        roleLabel: 'ZAG',
        acceptedPositions: ['ZAG', 'VOL'],
        line: 'DEF',
        atkRelX: -0.26,
        atkRelProgress: -0.28,
        defRelX: -0.22,
        defRelProgress: -0.61,
        holdingAnchor: true,
        freedomRadius: 9,
      },
      {
        slotIndex: 2,
        roleLabel: 'ZAG',
        acceptedPositions: ['ZAG', 'VOL'],
        line: 'DEF',
        atkRelX: 0.26,
        atkRelProgress: -0.28,
        defRelX: 0.22,
        defRelProgress: -0.61,
        holdingAnchor: true,
        freedomRadius: 9,
      },
      {
        slotIndex: 3,
        roleLabel: 'LD',
        acceptedPositions: ['LD', 'MD', 'ZAG'],
        line: 'DEF',
        atkRelX: 0.75,
        atkRelProgress: -0.15,
        defRelX: 0.64,
        defRelProgress: -0.58,
        freedomRadius: 13,
      },
      {
        slotIndex: 4,
        roleLabel: 'ME',
        acceptedPositions: ['ME', 'PE', 'MC', 'LE'],
        line: 'MID',
        atkRelX: -0.72,
        atkRelProgress: 0.24,
        defRelX: -0.6,
        defRelProgress: -0.32,
        freedomRadius: 15,
      },
      {
        slotIndex: 5,
        roleLabel: 'VOL',
        acceptedPositions: ['VOL', 'MC', 'ZAG'],
        line: 'MID',
        atkRelX: -0.22,
        atkRelProgress: 0.02,
        defRelX: -0.2,
        defRelProgress: -0.36,
        holdingAnchor: true,
        freedomRadius: 12,
      },
      {
        slotIndex: 6,
        roleLabel: 'MC',
        acceptedPositions: ['MC', 'MEI', 'VOL'],
        line: 'MID',
        atkRelX: 0.22,
        atkRelProgress: 0.14,
        defRelX: 0.2,
        defRelProgress: -0.34,
        freedomRadius: 14,
      },
      {
        slotIndex: 7,
        roleLabel: 'MD',
        acceptedPositions: ['MD', 'PD', 'MC', 'LD'],
        line: 'MID',
        atkRelX: 0.72,
        atkRelProgress: 0.24,
        defRelX: 0.6,
        defRelProgress: -0.32,
        freedomRadius: 15,
      },
      {
        slotIndex: 8,
        roleLabel: 'SA',
        acceptedPositions: ['SA', 'ATA', 'MEI', 'PE'],
        line: 'FWD',
        atkRelX: -0.24,
        atkRelProgress: 0.46,
        defRelX: -0.18,
        defRelProgress: 0.02,
        freedomRadius: 16,
      },
      {
        slotIndex: 9,
        roleLabel: 'ATA',
        acceptedPositions: ['ATA', 'SA', 'PD'],
        line: 'FWD',
        atkRelX: 0.24,
        atkRelProgress: 0.54,
        defRelX: 0.18,
        defRelProgress: 0.06,
        freedomRadius: 16,
      },
    ],
  },

  '3-5-2': {
    id: '3-5-2',
    displayName: '3-5-2 ALAS OFENSIVOS',
    outfieldSlots: [
      {
        slotIndex: 0,
        roleLabel: 'ZAG',
        acceptedPositions: ['ZAG', 'LE', 'VOL'],
        line: 'DEF',
        atkRelX: -0.44,
        atkRelProgress: -0.25,
        defRelX: -0.42,
        defRelProgress: -0.59,
        holdingAnchor: true,
        freedomRadius: 10,
      },
      {
        slotIndex: 1,
        roleLabel: 'ZAG',
        acceptedPositions: ['ZAG', 'VOL'],
        line: 'DEF',
        atkRelX: 0.0,
        atkRelProgress: -0.3,
        defRelX: 0.0,
        defRelProgress: -0.62,
        holdingAnchor: true,
        freedomRadius: 9,
      },
      {
        slotIndex: 2,
        roleLabel: 'ZAG',
        acceptedPositions: ['ZAG', 'LD', 'VOL'],
        line: 'DEF',
        atkRelX: 0.44,
        atkRelProgress: -0.25,
        defRelX: 0.42,
        defRelProgress: -0.59,
        holdingAnchor: true,
        freedomRadius: 10,
      },
      {
        slotIndex: 3,
        roleLabel: 'ME',
        acceptedPositions: ['LE', 'ME', 'PE'],
        line: 'MID',
        atkRelX: -0.8,
        atkRelProgress: 0.22,
        defRelX: -0.68,
        defRelProgress: -0.44,
        freedomRadius: 16,
      },
      {
        slotIndex: 4,
        roleLabel: 'VOL',
        acceptedPositions: ['VOL', 'MC'],
        line: 'MID',
        atkRelX: -0.22,
        atkRelProgress: -0.04,
        defRelX: -0.22,
        defRelProgress: -0.4,
        holdingAnchor: true,
        freedomRadius: 12,
      },
      {
        slotIndex: 5,
        roleLabel: 'MC',
        acceptedPositions: ['MC', 'VOL', 'MEI'],
        line: 'MID',
        atkRelX: 0.22,
        atkRelProgress: 0.06,
        defRelX: 0.22,
        defRelProgress: -0.36,
        freedomRadius: 14,
      },
      {
        slotIndex: 6,
        roleLabel: 'MD',
        acceptedPositions: ['LD', 'MD', 'PD'],
        line: 'MID',
        atkRelX: 0.8,
        atkRelProgress: 0.22,
        defRelX: 0.68,
        defRelProgress: -0.44,
        freedomRadius: 16,
      },
      {
        slotIndex: 7,
        roleLabel: 'MEI',
        acceptedPositions: ['MEI', 'MC', 'SA'],
        line: 'MID',
        atkRelX: 0.0,
        atkRelProgress: 0.3,
        defRelX: 0.0,
        defRelProgress: -0.15,
        freedomRadius: 16,
      },
      {
        slotIndex: 8,
        roleLabel: 'SA',
        acceptedPositions: ['SA', 'ATA', 'PE', 'MEI'],
        line: 'FWD',
        atkRelX: -0.25,
        atkRelProgress: 0.5,
        defRelX: -0.2,
        defRelProgress: 0.04,
        freedomRadius: 16,
      },
      {
        slotIndex: 9,
        roleLabel: 'ATA',
        acceptedPositions: ['ATA', 'SA', 'PD'],
        line: 'FWD',
        atkRelX: 0.25,
        atkRelProgress: 0.54,
        defRelX: 0.2,
        defRelProgress: 0.06,
        freedomRadius: 16,
      },
    ],
  },
};

function hashClubId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/**
 * Seleciona a formação tática real do time:
 * - Para o time do usuário, garante encaixe natural para a posição de carreira do atleta!
 * - Para o rival, varia autenticamente entre 4-3-3, 4-2-3-1, 4-4-2 e 3-5-2 conforme o perfil do clube!
 */
export function selectClubTacticalFormation(
  club: ClubData,
  userPosition?: PositionCode | null,
): TacticalFormationSpec {
  if (userPosition) {
    if (userPosition === 'MEI') return TACTICAL_FORMATIONS['4-2-3-1'];
    if (userPosition === 'SA' || userPosition === 'ME' || userPosition === 'MD') {
      return TACTICAL_FORMATIONS['4-4-2'];
    }
    if (userPosition === 'PE' || userPosition === 'PD') return TACTICAL_FORMATIONS['4-3-3'];
    return hashClubId(club.id) % 2 === 0
      ? TACTICAL_FORMATIONS['4-3-3']
      : TACTICAL_FORMATIONS['4-2-3-1'];
  }

  const order: TacticalFormationId[] = ['4-3-3', '4-2-3-1', '4-4-2', '3-5-2'];
  const idx = hashClubId(`${club.id}_${club.leagueId}`) % order.length;
  return TACTICAL_FORMATIONS[order[idx]];
}

export function findBestSlotIndexForPosition(
  formation: TacticalFormationSpec,
  pos: PositionCode,
): number {
  const exact = formation.outfieldSlots.findIndex((s) => s.roleLabel === pos);
  if (exact !== -1) return exact;
  const compat = formation.outfieldSlots.findIndex((s) => s.acceptedPositions.includes(pos));
  if (compat !== -1) return compat;
  return 8;
}

/**
 * Calcula a Âncora Elástica Dinâmica (Buckland Elastic Rubber-Sheet + Linha de Impedimento Sincronizada):
 * - Transita suavemente entre o formato compacto de Defesa (possessionBlend = 0) e o posicional de Ataque (1)
 * - Faz balanço lateral em direção ao corredor da bola sem perder a estrutura de zonas
 * - Sincroniza os defensores na linha de impedimento (`defensiveLineZ`) e mantém os atacantes ~1.0m em condição legal!
 */
export function computeElasticSlotAnchor(
  slot: TacticalSlotSpec,
  attackDir: -1 | 1,
  smoothBallPos: THREE.Vector3,
  possessionBlend: number,
  defensiveLineProgress: number,
  opponentOffsideProgress: number,
  outTarget: THREE.Vector3,
): THREE.Vector3 {
  const blend = Math.max(0, Math.min(1, possessionBlend));
  const relX = slot.defRelX + (slot.atkRelX - slot.defRelX) * blend;
  let relProg = slot.defRelProgress + (slot.atkRelProgress - slot.defRelProgress) * blend;

  // Progresso da bola na perspectiva deste time (-1 = próprio gol, +1 = gol adversário)
  const ballProgress = Math.max(
    -0.95,
    Math.min(0.95, (smoothBallPos.z * attackDir) / PITCH.HALF_L),
  );

  // Deslocamento longitudinal elástico acompanhando a altura da bola
  const longitudinalFollow = slot.holdingAnchor ? 0.28 : slot.line === 'MID' ? 0.38 : 0.34;
  relProg += ballProgress * longitudinalFollow;

  // Sincronização estrita da última linha defensiva (ZAGs e Laterais sem bola sobem/descem juntos!)
  if (slot.line === 'DEF') {
    const isFullback = Math.abs(slot.atkRelX) > 0.55;
    if (!isFullback) {
      relProg = defensiveLineProgress;
    } else {
      // Lateral do lado da bola apoia mais no ataque; lateral do lado oposto fecha a linha de 3/4 atrás!
      const rawWorldSideX = relX * -attackDir * PITCH.HALF_W;
      const onBallSide = rawWorldSideX * smoothBallPos.x > 0;
      const overlapBoost = blend * (onBallSide ? 0.22 : 0.06);
      relProg = Math.max(defensiveLineProgress, defensiveLineProgress + overlapBoost);
    }
  }

  // Atacantes respeitam a linha de impedimento adversária (~1.1m antes do penúltimo defensor!)
  if (slot.line === 'FWD') {
    const onsideCap = Math.max(0.04, opponentOffsideProgress - 0.022);
    relProg = Math.min(relProg, onsideCap);
  }

  relProg = Math.max(-0.88, Math.min(0.89, relProg));

  // Balanço lateral tático (mais fechado defendendo para trancar o funil central; aberto atacando!)
  const ballShiftFactor = 0.24 * (1 - blend) + 0.11 * blend;
  const lateralShiftMeters = smoothBallPos.x * ballShiftFactor;
  const widthCompression = 0.8 + 0.2 * blend;

  const worldX = Math.max(
    -PITCH.HALF_W + 2.5,
    Math.min(
      PITCH.HALF_W - 2.5,
      relX * -attackDir * PITCH.HALF_W * widthCompression + lateralShiftMeters,
    ),
  );
  const worldZ = Math.max(
    -PITCH.HALF_L + 4.5,
    Math.min(PITCH.HALF_L - 4.5, relProg * attackDir * PITCH.HALF_L),
  );

  return outTarget.set(worldX, 0, worldZ);
}

/**
 * Posição organizada no próprio campo para Saída de Bola (Kickoff) no círculo central!
 */
export function computeKickoffSlotPosition(
  slot: TacticalSlotSpec,
  attackDir: -1 | 1,
  isKickingOffTeam: boolean,
  isPrimaryKickoffTaker: boolean,
): THREE.Vector3 {
  if (isKickingOffTeam && isPrimaryKickoffTaker) {
    return new THREE.Vector3(attackDir === -1 ? -0.85 : 0.85, 0, attackDir === -1 ? 0.45 : -0.45);
  }

  // Todos os demais atletas posicionam-se na própria metade (progresso negativo: -0.68 .. -0.06)
  const baseProg =
    slot.line === 'DEF'
      ? -0.58
      : slot.line === 'MID'
        ? slot.holdingAnchor
          ? -0.38
          : -0.26
        : -0.08;

  let wx = slot.atkRelX * -attackDir * (PITCH.HALF_W * 0.82);
  let wz = baseProg * attackDir * PITCH.HALF_L;

  // Respeita o círculo central (raio 9.15m) para o time que não dá a saída!
  if (!isKickingOffTeam && Math.hypot(wx, wz) < 9.8) {
    const ang = Math.atan2(wx, wz);
    wx = Math.sin(ang) * 10.2;
    wz = -attackDir * Math.max(3.5, Math.abs(Math.cos(ang) * 10.2));
  }

  return new THREE.Vector3(wx, 0, wz);
}
