import { FullSquadPlayer, SquadPosition } from '../../../data/clubs/types';
import { CareerPlayer } from '../../../domains/player/playerTypes';
import { SquadRole } from '../../../shared/types/common';

export interface PitchLineupPlayer {
  id: string;
  displayName: string;
  slotLabel: SquadPosition;
  ovr: number;
  jersey: number;
  xPct: number; // 0..100 horizontal no campinho
  yPct: number; // 0..100 vertical (topo = ataque, base = goleiro)
  isUserPro: boolean;
}

export interface BenchLineupPlayer {
  id: string;
  displayName: string;
  pos: SquadPosition;
  ovr: number;
  jersey: number;
  isUserPro: boolean;
}

interface FormationSlot {
  slotLabel: SquadPosition;
  accepted: SquadPosition[];
  xPct: number;
  yPct: number;
}

const FORMATION_433: FormationSlot[] = [
  { slotLabel: 'PE', accepted: ['PE', 'ME', 'SA', 'ATA'], xPct: 20, yPct: 18 },
  { slotLabel: 'ATA', accepted: ['ATA', 'SA', 'PD', 'PE'], xPct: 50, yPct: 13 },
  { slotLabel: 'PD', accepted: ['PD', 'MD', 'SA', 'ATA'], xPct: 80, yPct: 18 },

  { slotLabel: 'MC', accepted: ['MC', 'MEI', 'ME', 'VOL'], xPct: 27, yPct: 45 },
  { slotLabel: 'MEI', accepted: ['MEI', 'MC', 'SA', 'VOL'], xPct: 50, yPct: 38 },
  { slotLabel: 'VOL', accepted: ['VOL', 'MC', 'MD'], xPct: 73, yPct: 47 },

  { slotLabel: 'LE', accepted: ['LE', 'ZAG', 'ME'], xPct: 15, yPct: 72 },
  { slotLabel: 'ZAG', accepted: ['ZAG', 'VOL', 'LD'], xPct: 38, yPct: 75 },
  { slotLabel: 'ZAG', accepted: ['ZAG', 'VOL', 'LE'], xPct: 62, yPct: 75 },
  { slotLabel: 'LD', accepted: ['LD', 'ZAG', 'MD'], xPct: 85, yPct: 72 },

  { slotLabel: 'GK', accepted: ['GK'], xPct: 50, yPct: 91 },
];

function shortSurname(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  return parts.length > 1 ? parts[parts.length - 1] : parts[0];
}

export function buildTeamMatchLineup(
  rawSquad: FullSquadPlayer[],
  userPlayer: CareerPlayer | null,
  userRole: SquadRole | null,
  isUserClub: boolean,
): { starters: PitchLineupPlayer[]; bench: BenchLineupPlayer[] } {
  const pool = [...rawSquad].sort((a, b) => b.ovr - a.ovr);
  const usedIds = new Set<string>();
  const starters: PitchLineupPlayer[] = [];

  const userIsStarter =
    isUserClub &&
    userPlayer &&
    (userRole === 'BASE_TITULAR' || userRole === 'TITULAR' || userRole === 'ESTRELA');

  // Descobrir em qual slot da formação 4-3-3 o jogador do usuário melhor se encaixa
  let userTargetSlotIdx = -1;
  if (userIsStarter && userPlayer) {
    userTargetSlotIdx = FORMATION_433.findIndex((s) => s.slotLabel === userPlayer.position);
    if (userTargetSlotIdx === -1) {
      userTargetSlotIdx = FORMATION_433.findIndex((s) =>
        s.accepted.includes(userPlayer.position),
      );
    }
    if (userTargetSlotIdx === -1) userTargetSlotIdx = 1;
  }

  FORMATION_433.forEach((slot, idx) => {
    if (idx === userTargetSlotIdx && userPlayer) {
      starters.push({
        id: '__USER_PRO__',
        displayName: userPlayer.shirtName,
        slotLabel: userPlayer.position,
        ovr: userPlayer.overall,
        jersey: userPlayer.shirtNumber,
        xPct: slot.xPct,
        yPct: slot.yPct,
        isUserPro: true,
      });
      return;
    }

    const picked =
      pool.find((p) => !usedIds.has(p.id) && p.pos === slot.slotLabel) ??
      pool.find((p) => !usedIds.has(p.id) && slot.accepted.includes(p.pos)) ??
      pool.find((p) => !usedIds.has(p.id) && (slot.slotLabel === 'GK' ? true : p.pos !== 'GK')) ??
      pool[0];

    if (picked) {
      usedIds.add(picked.id);
      starters.push({
        id: picked.id,
        displayName: shortSurname(picked.name),
        slotLabel: slot.slotLabel,
        ovr: picked.ovr,
        jersey: picked.jersey,
        xPct: slot.xPct,
        yPct: slot.yPct,
        isUserPro: false,
      });
    }
  });

  const bench: BenchLineupPlayer[] = [];
  if (isUserClub && userPlayer && !userIsStarter) {
    bench.push({
      id: '__USER_PRO__',
      displayName: userPlayer.shirtName,
      pos: userPlayer.position,
      ovr: userPlayer.overall,
      jersey: userPlayer.shirtNumber,
      isUserPro: true,
    });
  }

  for (const p of pool) {
    if (bench.length >= 7) break;
    if (!usedIds.has(p.id)) {
      usedIds.add(p.id);
      bench.push({
        id: p.id,
        displayName: p.name,
        pos: p.pos,
        ovr: p.ovr,
        jersey: p.jersey,
        isUserPro: false,
      });
    }
  }

  return { starters, bench };
}
