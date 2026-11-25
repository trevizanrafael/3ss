import * as THREE from 'three';
import { ClubData, SquadPosition } from '../../data/clubs/types';
import { PitchLineupPlayer } from '../../features/career-hub/match-day/buildMatchLineup';
import {
  CareerPlayer,
  HairStyleCode,
} from '../../domains/player/playerTypes';
import { PositionCode } from '../../shared/types/common';
import {
  animatePitchActor,
  createPitchFootballerActor,
  PitchActorInstance,
  PitchPoseState,
} from '../actors/pitchActorRig';
import { playBallKickSfx } from '../audio/matchAudio';
import { BALL_AERO, BallState } from '../physics/ballPhysics';
import { PITCH } from '../physics/pitchConstants';
import { TacticalFormationSpec, TacticalSlotSpec } from './tacticalFormations';
import {
  AssignedAgentDirective,
  TacticalParticipantSnapshot,
  TeamTacticalCoordinatorState,
} from './teamCoordinatorAI';

export interface OutfieldAIAgent {
  id: string;
  teamSide: 'HOME' | 'AWAY';
  attackDir: -1 | 1;
  shirtName: string;
  jersey: number;
  ovr: number;
  slot: TacticalSlotSpec;
  profile: CareerPlayer;
  actor: PitchActorInstance;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  facingYaw: number;
  maxSprintSpeed: number;
  baseJogSpeed: number;
  kickAnimTimer: number;
  slideTimer: number;
  tackleCooldown: number;
  fakeShotFreezeTimer: number;
  decisionTimer: number;
  carryTime: number;
  minHoldTime: number;
}

export interface OutfieldStepEvents {
  passedToId: string | null;
  shotTakenBy: string | null;
}

const SKIN_PALETTE = ['#F5CBA7', '#E0AC69', '#C68642', '#8D5524', '#5C3818', '#F1C27D'];
const HAIR_STYLES: HairStyleCode[] = [
  'CURTO',
  'DEGRADE',
  'TOPETE',
  'ARREPIADO',
  'AFRO',
  'TRANCA',
  'RASPADO',
  'COQUE',
  'MOICANO',
];
const HAIR_COLORS = ['#111827', '#1F2937', '#451A03', '#92400E', '#D97706', '#090D16'];
const BOOT_COLORS = ['#F8FAFC', '#10B981', '#F59E0B', '#38BDF8', '#EF4444', '#A855F7'];

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function clampAttr(v: number): number {
  return Math.max(42, Math.min(97, Math.round(v)));
}

function buildAttributesFromOvrAndRole(
  ovr: number,
  role: SquadPosition,
): CareerPlayer['attributes'] {
  const isFast = role === 'PE' || role === 'PD' || role === 'LE' || role === 'LD' || role === 'ATA';
  const isFinisher = role === 'ATA' || role === 'SA' || role === 'PE' || role === 'PD';
  const isPlaymaker = role === 'MEI' || role === 'MC' || role === 'VOL';
  const isDefender = role === 'ZAG' || role === 'LE' || role === 'LD' || role === 'VOL';

  return {
    acceleration: clampAttr(ovr + (isFast ? 5 : -2)),
    sprintSpeed: clampAttr(ovr + (isFast ? 6 : -2)),
    agility: clampAttr(ovr + (isFast || isPlaymaker ? 3 : -3)),
    balance: clampAttr(ovr),
    stamina: clampAttr(ovr + 3),
    strength: clampAttr(ovr + (isDefender ? 5 : -1)),
    finishing: clampAttr(ovr + (isFinisher ? 4 : isPlaymaker ? -4 : -14)),
    shotPower: clampAttr(ovr + (isFinisher ? 3 : 0)),
    longShots: clampAttr(ovr + (isPlaymaker || isFinisher ? 2 : -10)),
    positioning: clampAttr(ovr + 2),
    shortPass: clampAttr(ovr + (isPlaymaker ? 5 : 1)),
    longPass: clampAttr(ovr + (isPlaymaker ? 4 : 0)),
    dribbling: clampAttr(ovr + (isFast || isPlaymaker ? 3 : -6)),
    ballControl: clampAttr(ovr + 2),
    tackling: clampAttr(ovr + (isDefender ? 6 : -14)),
    interceptions: clampAttr(ovr + (isDefender ? 5 : -10)),
  };
}

export function createOutfieldAgentsForTeam(
  teamSide: 'HOME' | 'AWAY',
  attackDir: -1 | 1,
  renderClub: ClubData,
  formation: TacticalFormationSpec,
  starters: PitchLineupPlayer[],
  userSlotIndex: number | null,
): OutfieldAIAgent[] {
  const outfieldStarters = starters.filter((s) => s.slotLabel !== 'GK' && !s.isUserPro);
  const usedStarterIds = new Set<string>();
  const agents: OutfieldAIAgent[] = [];

  for (const slot of formation.outfieldSlots) {
    if (teamSide === 'HOME' && userSlotIndex === slot.slotIndex) {
      continue; // Esse slot pertence ao jogador controlado pelo usuário!
    }

    const picked =
      outfieldStarters.find(
        (p) => !usedStarterIds.has(p.id) && p.slotLabel === slot.roleLabel,
      ) ??
      outfieldStarters.find(
        (p) => !usedStarterIds.has(p.id) && slot.acceptedPositions.includes(p.slotLabel),
      ) ??
      outfieldStarters.find((p) => !usedStarterIds.has(p.id));

    if (picked) usedStarterIds.add(picked.id);

    const h = hashStr(`${teamSide}_${slot.slotIndex}_${picked?.id ?? slot.roleLabel}`);
    const shirtName = (picked?.displayName ?? slot.roleLabel).slice(0, 12).toUpperCase();
    const jersey = picked?.jersey ?? slot.slotIndex + 2;
    const ovr = picked?.ovr ?? renderClub.squadAvgOvr;
    const posCode: PositionCode =
      slot.roleLabel === 'GK' ? 'ZAG' : (slot.roleLabel as PositionCode);
    const attrs = buildAttributesFromOvrAndRole(ovr, slot.roleLabel);

    const profile: CareerPlayer = {
      fullName: picked?.displayName ?? `${slot.roleLabel} #${jersey}`,
      shirtName,
      shirtNumber: jersey,
      age: 20 + (h % 12),
      birthDay: 1 + (h % 27),
      birthMonth: 1 + (h % 12),
      birthYear: 2002,
      nationality: renderClub.country,
      startingLeagueCountry: 'BRA',
      position: posCode,
      preferredFoot: slot.atkRelX < -0.2 ? 'ESQUERDA' : 'DIREITA',
      heightCm: slot.roleLabel === 'ZAG' ? 186 + (h % 7) : 175 + (h % 12),
      weightKg: slot.roleLabel === 'ZAG' ? 81 + (h % 7) : 71 + (h % 9),
      appearance: {
        skinTone: SKIN_PALETTE[h % SKIN_PALETTE.length],
        hairStyle: HAIR_STYLES[(h >> 3) % HAIR_STYLES.length],
        hairColor: HAIR_COLORS[(h >> 6) % HAIR_COLORS.length],
        facialHair: h % 3 === 0 ? 'BARBA_BAIXA' : 'LIMPO',
        eyeColor: '#2B2118',
        shirtTuck: h % 4 === 0 ? 'DENTRO_CALCAO' : 'SOLTA',
        sleeveStyle: h % 5 === 0 ? 'LONGA' : 'CURTA',
        sockHeight: h % 3 === 0 ? 'ALTO' : 'PADRAO',
        accessory: 'NENHUM',
        bootColor: BOOT_COLORS[(h >> 4) % BOOT_COLORS.length],
      },
      attributes: attrs,
      attributeXp: {
        acceleration: 0, sprintSpeed: 0, agility: 0, balance: 0, stamina: 0, strength: 0,
        finishing: 0, shotPower: 0, longShots: 0, positioning: 0, shortPass: 0, longPass: 0,
        dribbling: 0, ballControl: 0, tackling: 0, interceptions: 0,
      },
      overall: ovr,
      reputationStars: 2,
      stamina: 100,
      careerTotals: { matches: 0, goals: 0, assists: 0, threeStarMatches: 0, trophies: 0 },
    };

    const actor = createPitchFootballerActor(profile, renderClub);
    const id = `${teamSide}_${slot.slotIndex + 2}`;

    // Velocidades ligeiramente abaixo do sprint máximo do usuário p/ dar protagonismo sem perder competitividade!
    const maxSprintSpeed = 7.35 + (attrs.sprintSpeed / 99) * 2.55;
    const baseJogSpeed = 5.2 + (attrs.agility / 99) * 1.35;

    agents.push({
      id,
      teamSide,
      attackDir,
      shirtName,
      jersey,
      ovr,
      slot,
      profile,
      actor,
      pos: new THREE.Vector3(0, 0, 0),
      vel: new THREE.Vector3(0, 0, 0),
      facingYaw: attackDir === -1 ? Math.PI : 0,
      maxSprintSpeed,
      baseJogSpeed,
      kickAnimTimer: 0,
      slideTimer: 0,
      tackleCooldown: 0,
      fakeShotFreezeTimer: 0,
      decisionTimer: 0.15,
      carryTime: 0,
      minHoldTime: 0.35,
    });
  }

  return agents;
}

function shortestYawDiff(from: number, to: number): number {
  let d = ((to - from + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/**
 * Avalia segurança da linha de passe (Cover Shadow + Tempo de Interceptação dos 10 adversários) -> 0..1!
 */
export function evaluatePassLaneSafety01(
  fromX: number,
  fromZ: number,
  toX: number,
  toZ: number,
  passSpeed: number,
  opponents: TacticalParticipantSnapshot[],
): number {
  const dx = toX - fromX;
  const dz = toZ - fromZ;
  const dist = Math.hypot(dx, dz);
  if (dist < 1.2) return 0.1;

  let safety = 1.0;
  for (const opp of opponents) {
    const relX = opp.pos.x - fromX;
    const relZ = opp.pos.z - fromZ;
    const proj = (relX * dx + relZ * dz) / dist;
    if (proj <= 0.3 || proj >= dist + 1.2) continue;

    const perpDist = Math.abs(relX * dz - relZ * dx) / dist;
    const ballTimeAtProj = proj / Math.max(11, passSpeed * 0.85);
    const oppReachTime = Math.max(0, perpDist - 0.75) / Math.max(5.5, opp.maxSprintSpeed * 0.92);

    const margin = oppReachTime - ballTimeAtProj;
    if (margin < -0.14) {
      return 0.02; // Sombra de marcação fechada: interceptação quase certa!
    }
    if (margin < 0.22) {
      safety = Math.min(safety, 0.22 + ((margin + 0.14) / 0.36) * 0.65);
    }
  }

  return safety;
}

function solveAIShotVelocity(
  startPos: THREE.Vector3,
  goalZ: number,
  targetX: number,
  targetY: number,
  horizSpeed: number,
): THREE.Vector3 {
  const dz = goalZ - startPos.z;
  const distZ = Math.max(3.5, Math.abs(dz));
  const zSign = dz < 0 ? -1 : 1;
  const estT = distZ / Math.max(15, horizSpeed * 0.93);

  let vx = (targetX - startPos.x) / estT;
  const maxVx = horizSpeed * 0.7;
  vx = Math.max(-maxVx, Math.min(maxVx, vx));
  const vz = zSign * Math.sqrt(Math.max(120, horizSpeed * horizSpeed - vx * vx));

  const rawVy = (targetY - startPos.y - 0.5 * BALL_AERO.GRAVITY * estT * estT) / estT;
  const vy = Math.max(1.0, Math.min(8.4, rawVy));
  return new THREE.Vector3(vx, vy, vz);
}

function executeAgentPass(
  agent: OutfieldAIAgent,
  ball: BallState,
  targetX: number,
  targetZ: number,
  lofted: boolean,
): void {
  ball.ownerId = null;
  ball.lastTouchBy = agent.id;
  ball.lastTouchTeam = agent.teamSide;
  ball.touchCooldown = 0.28;

  const dx = targetX - ball.pos.x;
  const dz = targetZ - ball.pos.z;
  const dist = Math.max(1.5, Math.hypot(dx, dz));
  const dirX = dx / dist;
  const dirZ = dz / dist;

  const passAccuracy = agent.profile.attributes.shortPass / 99;
  const jitter = (1 - passAccuracy) * (lofted ? 1.4 : 0.75);
  const aimX = dirX + (Math.random() - 0.5) * (jitter / Math.max(6, dist));
  const aimZ = dirZ + (Math.random() - 0.5) * (jitter / Math.max(6, dist));
  const aimLen = Math.max(0.01, Math.hypot(aimX, aimZ));
  const nx = aimX / aimLen;
  const nz = aimZ / aimLen;

  if (lofted) {
    const horizSpd = Math.min(24.5, Math.max(13.5, dist * 0.88));
    const tFlight = dist / horizSpd;
    const loftY = Math.min(11.6, Math.max(5.2, 0.5 * Math.abs(BALL_AERO.GRAVITY) * tFlight * 0.88));
    ball.vel.set(nx * horizSpd, loftY, nz * horizSpd);
    ball.spin.set(-3.2, 0, 0);
  } else {
    // Velocidade calibrada pela fricção da grama para chegar redonda no pé do companheiro!
    const spd = Math.min(
      26.0,
      Math.max(12.5, Math.sqrt(2 * BALL_AERO.GRASS_FRICTION * dist + 84)),
    );
    ball.vel.set(nx * spd, 0.2, nz * spd);
    ball.spin.set(0, 0, 0);
  }

  agent.facingYaw = Math.atan2(nx, nz);
  agent.kickAnimTimer = 0.26;
  agent.carryTime = 0;
  playBallKickSfx(lofted ? 0.54 : 0.45);
}

function executeAgentShot(
  agent: OutfieldAIAgent,
  ball: BallState,
  oppGkPos: THREE.Vector3,
): void {
  const goalZ = agent.attackDir * PITCH.HALF_L;
  const openLeft = oppGkPos.x - -PITCH.GOAL_HALF_W;
  const openRight = PITCH.GOAL_HALF_W - oppGkPos.x;
  const side = openRight >= openLeft ? 1 : -1;

  const finSkill = agent.profile.attributes.finishing / 99;
  const scatter = (1 - finSkill) * 1.45;
  const targetX = side * (2.65 + finSkill * 0.85) + (Math.random() - 0.5) * scatter;
  const targetY = 0.65 + Math.random() * 1.65;
  const horizSpd = 24.5 + (agent.profile.attributes.shotPower / 99) * 10.5;

  const solved = solveAIShotVelocity(ball.pos, goalZ, targetX, targetY, horizSpd);
  ball.ownerId = null;
  ball.lastTouchBy = agent.id;
  ball.lastTouchTeam = agent.teamSide;
  ball.touchCooldown = 0.34;
  ball.vel.copy(solved);
  ball.spin.set(-2.5, (Math.random() - 0.5) * 3.0, 0);

  agent.facingYaw = Math.atan2(solved.x, solved.z);
  agent.kickAnimTimer = 0.3;
  agent.carryTime = 0;
  playBallKickSfx(0.76);
}

/**
 * Seleciona automaticamente o melhor companheiro na direção em que o USUÁRIO apontou o analógico + força!
 * (Estilo passe semi-assistido do FIFA: toque curto pega o mais próximo no cone; barra cheia pega o mais fundo!)
 */
export function selectBestTeammateForUserKick(
  userPos: THREE.Vector3,
  aimDirX: number,
  aimDirZ: number,
  hasExplicitStickAim: boolean,
  power01: number,
  intent: 'PASS' | 'THROUGH' | 'CROSS',
  homeAgents: OutfieldAIAgent[],
  opponents: TacticalParticipantSnapshot[],
): OutfieldAIAgent | null {
  if (homeAgents.length === 0) return null;

  const idealDist =
    intent === 'PASS'
      ? 8 + power01 * 24
      : intent === 'THROUGH'
        ? 11 + power01 * 24
        : 14 + power01 * 28;

  let best: OutfieldAIAgent | null = null;
  let bestScore = -999;

  for (const mate of homeAgents) {
    const dx = mate.pos.x - userPos.x;
    const dz = mate.pos.z - userPos.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 2.2 || dist > 56) continue;

    const dirX = dx / dist;
    const dirZ = dz / dist;
    const dot = dirX * aimDirX + dirZ * aimDirZ;

    // Se o jogador inclinou o analógico, exige estar dentro de um cone amplo (~75°); senão busca à frente!
    if (hasExplicitStickAim && dot < 0.22) continue;
    if (!hasExplicitStickAim && dot < -0.15) continue;

    const distDiff = Math.abs(dist - idealDist);
    const distScore = Math.max(0, 1 - distDiff / 24);
    const laneSafety = evaluatePassLaneSafety01(
      userPos.x,
      userPos.z,
      mate.pos.x,
      mate.pos.z,
      19,
      opponents,
    );

    const score = dot * 0.62 + distScore * 0.25 + laneSafety * 0.18;
    if (score > bestScore) {
      bestScore = score;
      best = mate;
    }
  }

  if (best) return best;

  // Fallback: companheiro mais alinhado na direção apontada
  return [...homeAgents].sort((a, b) => {
    const da = Math.hypot(a.pos.x - userPos.x, a.pos.z - userPos.z);
    const db = Math.hypot(b.pos.x - userPos.x, b.pos.z - userPos.z);
    const dotA = ((a.pos.x - userPos.x) * aimDirX + (a.pos.z - userPos.z) * aimDirZ) / Math.max(1, da);
    const dotB = ((b.pos.x - userPos.x) * aimDirX + (b.pos.z - userPos.z) * aimDirZ) / Math.max(1, db);
    return dotB - dotA;
  })[0];
}

/**
 * Executa 1 frame de física, marcação, separação Boids e Utility AI para todos os jogadores de linha de um time!
 */
export function stepOutfieldAgentsTeam(
  agents: OutfieldAIAgent[],
  coord: TeamTacticalCoordinatorState,
  ball: BallState,
  allTeammateSnapshots: TacticalParticipantSnapshot[],
  opponentSnapshots: TacticalParticipantSnapshot[],
  oppGkPos: THREE.Vector3,
  userQueuedCall: 'PASS' | 'THROUGH' | 'CROSS' | null,
  userCommandedShoot: boolean,
  userPos: THREE.Vector3,
  userVel: THREE.Vector3,
  userTriggeredFakeShotDirX: number | null,
  dt: number,
  timeSec: number,
): OutfieldStepEvents {
  const events: OutfieldStepEvents = { passedToId: null, shotTakenBy: null };
  const goalZ = coord.attackDir * PITCH.HALF_L;

  for (const ag of agents) {
    ag.kickAnimTimer = Math.max(0, ag.kickAnimTimer - dt);
    ag.slideTimer = Math.max(0, ag.slideTimer - dt);
    ag.tackleCooldown = Math.max(0, ag.tackleCooldown - dt);
    ag.fakeShotFreezeTimer = Math.max(0, ag.fakeShotFreezeTimer - dt);

    // Se o usuário aplicou Fingir Chute (B -> A) perto de um marcador rival, o marcador toma o corte no contrapé!
    if (
      ag.teamSide === 'AWAY' &&
      userTriggeredFakeShotDirX !== null &&
      Math.hypot(ag.pos.x - userPos.x, ag.pos.z - userPos.z) < 4.5
    ) {
      ag.fakeShotFreezeTimer = 0.42;
      ag.vel.x = userTriggeredFakeShotDirX * 4.2;
    }

    const distToBall = Math.hypot(ball.pos.x - ag.pos.x, ball.pos.z - ag.pos.z);

    // 1. Domínio de bola solta / interceptação
    const canClaimLoose =
      ball.ownerId === null &&
      ball.touchCooldown <= 0 &&
      distToBall < 1.05 &&
      ball.pos.y < 1.75 &&
      !(ball.lastTouchBy === ag.id && ball.touchCooldown > 0.02);

    if (canClaimLoose) {
      ball.ownerId = ag.id;
      ball.lastTouchBy = ag.id;
      ball.lastTouchTeam = ag.teamSide;
      ball.spin.set(0, 0, 0);
      ag.carryTime = 0;
      ag.decisionTimer = 0.14;
      ag.minHoldTime = 0.24 + Math.random() * 0.28;
    }

    // 2. COM A BOLA NO PÉ: Condução Inteligente + Utility AI (Chute / Enfiada / Passe / Cruzamento / Drible)!
    if (ball.ownerId !== ag.id && ag.carryTime > 0) {
      // Acabou de ser desarmado: aplica breve recuperação humana p/ não roubar de volta no mesmo instante!
      ag.carryTime = 0;
      ag.tackleCooldown = Math.max(ag.tackleCooldown, 0.85);
    }

    if (ball.ownerId === ag.id) {
      ag.carryTime += dt;
      ag.decisionTimer -= dt;

      // 2A. Se for companheiro do usuário e o usuário pediu a bola (A / Y / X) ou mandou chutar (B), atende na hora!
      if (ag.teamSide === 'HOME') {
        if (userCommandedShoot && Math.abs(goalZ - ag.pos.z) < 31) {
          executeAgentShot(ag, ball, oppGkPos);
          events.shotTakenBy = ag.id;
          ag.actor.root.position.copy(ag.pos);
          ag.actor.root.rotation.y = ag.facingYaw;
          animatePitchActor(ag.actor, 'KICK', 0, 0, false, dt, timeSec);
          continue;
        }

        if (userQueuedCall !== null && ag.carryTime >= 0.08) {
          const uSpd = Math.hypot(userVel.x, userVel.z);
          let tx = userPos.x + userVel.x * 0.24;
          let tz = userPos.z + userVel.z * 0.24;
          let loft = false;

          if (userQueuedCall === 'THROUGH') {
            const leadZ = uSpd > 1.8 ? Math.min(-4.8, userVel.z * 0.95) : -6.5;
            tx = Math.max(-PITCH.HALF_W + 3, Math.min(PITCH.HALF_W - 3, userPos.x + userVel.x * 0.7));
            tz = Math.max(-PITCH.HALF_L + 5.5, userPos.z + leadZ);
          } else if (userQueuedCall === 'CROSS') {
            tx = userPos.x + userVel.x * 0.45;
            tz = Math.max(-PITCH.HALF_L + 6.0, userPos.z + userVel.z * 0.45);
            loft = true;
          }

          executeAgentPass(ag, ball, tx, tz, loft);
          coord.lockedPassReceiverId = 'USER';
          coord.lockedPassTimer = 2.0;
          events.passedToId = 'USER';
          ag.actor.root.position.copy(ag.pos);
          ag.actor.root.rotation.y = ag.facingYaw;
          animatePitchActor(ag.actor, 'KICK', 0, 0, false, dt, timeSec);
          continue;
        }
      }

      // 2B. Mede pressão do marcador mais próximo (First Defender)
      let nearestOppDist = 99;
      let nearestOppX = ag.pos.x;
      let nearestOppZ = ag.pos.z;
      for (const opp of opponentSnapshots) {
        const d = Math.hypot(opp.pos.x - ag.pos.x, opp.pos.z - ag.pos.z);
        if (d < nearestOppDist) {
          nearestOppDist = d;
          nearestOppX = opp.pos.x;
          nearestOppZ = opp.pos.z;
        }
      }

      // Direção inteligente de condução: avança rumo ao gol desviando lateralmente da pressão imediata!
      const goalPullX = (0 - ag.pos.x) * 0.35;
      const goalPullZ = coord.attackDir * 14.0;
      let evadeX = 0;
      let evadeZ = 0;
      if (nearestOppDist < 5.0 && nearestOppDist > 0.1) {
        const awayScale = ((5.0 - nearestOppDist) / 5.0) * 9.5;
        evadeX = ((ag.pos.x - nearestOppX) / nearestOppDist) * awayScale;
        evadeZ = ((ag.pos.z - nearestOppZ) / nearestOppDist) * awayScale * 0.55;
      }

      // Nunca entra conduzindo cego pra cima do goleiro dentro da pequena área!
      const distZToGoal = Math.abs(goalZ - ag.pos.z);
      const dribDirX = goalPullX + evadeX;
      const dribDirZ = distZToGoal < 7.5 ? 0 : goalPullZ + evadeZ;
      const dribLen = Math.max(0.01, Math.hypot(dribDirX, dribDirZ));
      const dribSpd =
        (nearestOppDist > 6.5 ? ag.maxSprintSpeed * 0.92 : ag.baseJogSpeed * 1.04) *
        (0.88 + (ag.profile.attributes.dribbling / 99) * 0.1);

      ag.vel.x += ((dribDirX / dribLen) * dribSpd - ag.vel.x) * Math.min(1, 10 * dt);
      ag.vel.z += ((dribDirZ / dribLen) * dribSpd - ag.vel.z) * Math.min(1, 10 * dt);
      ag.pos.addScaledVector(ag.vel, dt);
      ag.pos.x = Math.max(-PITCH.HALF_W + 1.4, Math.min(PITCH.HALF_W - 1.4, ag.pos.x));
      ag.pos.z = Math.max(-PITCH.HALF_L + 3.5, Math.min(PITCH.HALF_L - 3.5, ag.pos.z));

      if (Math.hypot(ag.vel.x, ag.vel.z) > 0.25) {
        ag.facingYaw +=
          shortestYawDiff(ag.facingYaw, Math.atan2(ag.vel.x, ag.vel.z)) * Math.min(1, 12 * dt);
      }

      ball.pos.set(
        ag.pos.x + Math.sin(ag.facingYaw) * 0.56,
        PITCH.BALL_RADIUS,
        ag.pos.z + Math.cos(ag.facingYaw) * 0.56,
      );
      ball.vel.copy(ag.vel);

      // 2C. Avaliação Utility AI (8 Hz ou imediata sob pressão < 2.3m!)
      const underHeavyPressure = nearestOppDist < 2.35;
      if (ag.decisionTimer <= 0 && (ag.carryTime >= ag.minHoldTime || underHeavyPressure)) {
        ag.decisionTimer = 0.13;

        const distToGoal = Math.hypot(ag.pos.x, goalZ - ag.pos.z);
        const oppOffsideProg = Math.max(
          0.05,
          ...opponentSnapshots.map((o) => (o.pos.z * coord.attackDir) / PITCH.HALF_L),
        );

        // 1) Utility de Chute ao Gol
        let shootUtility = 0;
        if (distToGoal < 25.5 && Math.abs(ag.pos.x) < 15.5) {
          const shotLaneSafety = evaluatePassLaneSafety01(
            ag.pos.x,
            ag.pos.z,
            0,
            goalZ,
            26,
            opponentSnapshots,
          );
          const rangeFactor = Math.max(0, 1 - (distToGoal - 8) / 18.5);
          shootUtility = (0.38 + rangeFactor * 0.62) * (0.45 + shotLaneSafety * 0.55);
          if (distToGoal < 14.5 && Math.abs(ag.pos.x) < 9.5) shootUtility += 0.28;
        }

        if (shootUtility >= 0.7) {
          executeAgentShot(ag, ball, oppGkPos);
          events.shotTakenBy = ag.id;
          ag.actor.root.position.copy(ag.pos);
          ag.actor.root.rotation.y = ag.facingYaw;
          animatePitchActor(ag.actor, 'KICK', 0, 0, false, dt, timeSec);
          continue;
        }

        // 2) Utility de Passe no Pé / Bola Enfiada / Cruzamento ou Virada de Jogo!
        let bestTarget: {
          id: string;
          tx: number;
          tz: number;
          loft: boolean;
          utility: number;
        } | null = null;

        const onAttackingWing = Math.abs(ag.pos.x) > 15.5 && distZToGoal < 21.0;

        for (const mate of allTeammateSnapshots) {
          if (mate.id === ag.id) continue;
          const dMate = Math.hypot(mate.pos.x - ag.pos.x, mate.pos.z - ag.pos.z);
          if (dMate < 3.8 || dMate > 48) continue;

          // Checa impedimento na hora do passe!
          const mateProg = (mate.pos.z * coord.attackDir) / PITCH.HALF_L;
          const myProg = (ag.pos.z * coord.attackDir) / PITCH.HALF_L;
          if (mateProg > myProg + 0.01 && mateProg > oppOffsideProg + 0.012) {
            continue; // Impedido -> não força passe!
          }

          // Espaço Voronoi ao redor do receptor
          let mateNearestOpp = 99;
          for (const opp of opponentSnapshots) {
            mateNearestOpp = Math.min(
              mateNearestOpp,
              Math.hypot(opp.pos.x - mate.pos.x, opp.pos.z - mate.pos.z),
            );
          }

          // Opção A: Passe firme no pé
          const footTx = mate.pos.x + mate.vel.x * 0.22;
          const footTz = mate.pos.z + mate.vel.z * 0.22;
          const laneSafe = evaluatePassLaneSafety01(
            ag.pos.x,
            ag.pos.z,
            footTx,
            footTz,
            19,
            opponentSnapshots,
          );

          if (laneSafe >= 0.28) {
            const progGain = (footTz - ag.pos.z) * coord.attackDir; // + se avança ao gol!
            const progScore = Math.max(-0.15, Math.min(0.42, progGain / 28));
            const voronoiScore = Math.min(0.32, mateNearestOpp / 26);
            const userStarBonus = mate.isUser && mateNearestOpp > 3.2 ? 0.14 : 0;
            const backpassRelief = underHeavyPressure && progGain < 0 ? 0.22 : 0;

            const uPass =
              laneSafe * 0.44 + progScore + voronoiScore + userStarBonus + backpassRelief;

            if (!bestTarget || uPass > bestTarget.utility) {
              bestTarget = {
                id: mate.id,
                tx: footTx,
                tz: footTz,
                loft: dMate > 31 && mateNearestOpp > 6.5, // Virada longa de jogo pelo alto!
                utility: uPass,
              };
            }
          }

          // Opção B: Bola Enfiada em Profundidade (Through-Ball) se o companheiro estiver atacando espaço!
          const isRunner =
            mate.id === coord.depthRunnerId ||
            mate.slot.line === 'FWD' ||
            (mate.isUser && mate.vel.z * coord.attackDir > 2.2);

          if (isRunner && mateProg <= oppOffsideProg + 0.005 && dMate < 38) {
            const leadMeters = 6.5;
            const thrTx = Math.max(
              -PITCH.HALF_W + 4,
              Math.min(PITCH.HALF_W - 4, mate.pos.x * 0.88 + mate.vel.x * 0.35),
            );
            const thrTz = Math.max(
              -PITCH.HALF_L + 6.5,
              Math.min(PITCH.HALF_L - 6.5, mate.pos.z + coord.attackDir * leadMeters),
            );

            const thrSafe = evaluatePassLaneSafety01(
              ag.pos.x,
              ag.pos.z,
              thrTx,
              thrTz,
              21,
              opponentSnapshots,
            );
            let spaceAhead = 99;
            for (const opp of opponentSnapshots) {
              spaceAhead = Math.min(
                spaceAhead,
                Math.hypot(opp.pos.x - thrTx, opp.pos.z - thrTz),
              );
            }

            if (thrSafe >= 0.36 && spaceAhead > 4.2) {
              const uThr =
                thrSafe * 0.45 +
                0.34 +
                Math.min(0.25, spaceAhead / 24) +
                (mate.isUser ? 0.14 : 0) +
                (mate.id === coord.depthRunnerId ? 0.12 : 0);

              if (!bestTarget || uThr > bestTarget.utility) {
                bestTarget = {
                  id: mate.id,
                  tx: thrTx,
                  tz: thrTz,
                  loft: false,
                  utility: uThr,
                };
              }
            }
          }

          // Opção C: Cruzamento da linha de fundo para quem pisa na área!
          const mateNearBox = Math.abs(goalZ - mate.pos.z) < 18.5 && Math.abs(mate.pos.x) < 12.5;
          if (onAttackingWing && mateNearBox) {
            const crossTx = mate.pos.x + mate.vel.x * 0.35;
            const crossTz = goalZ - coord.attackDir * (8.5 + Math.random() * 3.5);
            const uCross = 0.72 + (mate.isUser ? 0.15 : 0) + Math.min(0.15, mateNearestOpp / 20);
            if (!bestTarget || uCross > bestTarget.utility) {
              bestTarget = {
                id: mate.id,
                tx: crossTx,
                tz: crossTz,
                loft: true,
                utility: uCross,
              };
            }
          }
        }

        // 3) Utility de continuar conduzindo (Dribble) vs tocar a bola!
        const ownGoalDist = Math.abs(-goalZ - ag.pos.z);
        const openAheadBonus = Math.min(0.32, Math.max(0, (nearestOppDist - 3.2) / 14));
        const dribbleUtility =
          (ag.slot.line === 'DEF' ? 0.36 : 0.48) +
          openAheadBonus -
          ag.carryTime * 0.16 -
          (underHeavyPressure ? 0.28 : 0);

        if (bestTarget && bestTarget.utility > dribbleUtility) {
          executeAgentPass(ag, ball, bestTarget.tx, bestTarget.tz, bestTarget.loft);
          coord.lockedPassReceiverId = bestTarget.id;
          coord.lockedPassTimer = 2.1;
          events.passedToId = bestTarget.id;
          ag.actor.root.position.copy(ag.pos);
          ag.actor.root.rotation.y = ag.facingYaw;
          animatePitchActor(ag.actor, 'KICK', 0, 0, false, dt, timeSec);
          continue;
        }

        // Desafogo de segurança se um defensor estiver prensado dentro da própria área sem passe limpo!
        if (underHeavyPressure && ownGoalDist < 16.5 && ag.carryTime > 0.45) {
          const clearSide = ag.pos.x >= 0 ? 14 : -14;
          executeAgentPass(ag, ball, clearSide, ag.pos.z + coord.attackDir * 34, true);
          ag.actor.root.position.copy(ag.pos);
          ag.actor.root.rotation.y = ag.facingYaw;
          animatePitchActor(ag.actor, 'KICK', 0, 0, false, dt, timeSec);
          continue;
        }
      }
    } else if (ag.fakeShotFreezeTimer > 0) {
      // Tomou drible de corpo / fingir chute: escorrega um instante antes de recuperar!
      ag.pos.addScaledVector(ag.vel, dt);
      ag.vel.multiplyScalar(Math.max(0, 1 - 4.8 * dt));
    } else {
      // 3. SEM A BOLA: Segue a Diretriz Coletiva da Equipe + Força de Separação Boids + Bote Defensivo!
      const dir: AssignedAgentDirective | undefined = coord.directives.get(ag.id);
      const targetX = dir ? dir.targetPos.x : ag.pos.x;
      const targetZ = dir ? dir.targetPos.z : ag.pos.z;
      const duty = dir?.duty ?? 'ZONAL_ANCHOR';

      const dx = targetX - ag.pos.x;
      const dz = targetZ - ag.pos.z;
      const dist = Math.hypot(dx, dz);

      let desiredSpd = 0;
      if (duty === 'FETCH_LOOSE' || duty === 'DEPTH_RUNNER') {
        desiredSpd = dist > 0.18 ? ag.maxSprintSpeed : 0;
      } else if (duty === 'FIRST_DEFENDER') {
        // Aproxima rápido de longe e reduz p/ velocidade de contenção (Jockey) perto do portador!
        desiredSpd =
          dist > 4.2
            ? ag.maxSprintSpeed * 0.96
            : dist > 0.35
              ? Math.min(ag.baseJogSpeed * 1.05, 2.2 + dist * 1.15)
              : 0;
      } else {
        desiredSpd =
          dist > 6.5
            ? Math.min(ag.maxSprintSpeed * 0.9, dist * 1.35)
            : dist > 0.55
              ? Math.min(ag.baseJogSpeed, dist * 2.1)
              : 0;
      }

      let wishVx = dist > 0.08 ? (dx / dist) * desiredSpd : 0;
      let wishVz = dist > 0.08 ? (dz / dist) * desiredSpd : 0;

      // Separação Boids entre companheiros (< 2.8m) p/ NUNCA colarem dois bonecos no mesmo ponto!
      if (duty !== 'FETCH_LOOSE') {
        for (const tm of allTeammateSnapshots) {
          if (tm.id === ag.id) continue;
          const sx = ag.pos.x - tm.pos.x;
          const sz = ag.pos.z - tm.pos.z;
          const sd = Math.hypot(sx, sz);
          if (sd > 0.01 && sd < 2.8) {
            const push = ((2.8 - sd) / 2.8) * 3.8;
            wishVx += (sx / sd) * push;
            wishVz += (sz / sd) * push;
          }
        }
      }

      const accel = 11.5 + (ag.profile.attributes.acceleration / 99) * 6.0;
      ag.vel.x += (wishVx - ag.vel.x) * Math.min(1, accel * dt);
      ag.vel.z += (wishVz - ag.vel.z) * Math.min(1, accel * dt);
      ag.pos.addScaledVector(ag.vel, dt);
      ag.pos.x = Math.max(-PITCH.HALF_W + 0.8, Math.min(PITCH.HALF_W - 0.8, ag.pos.x));
      ag.pos.z = Math.max(-PITCH.HALF_L + 1.2, Math.min(PITCH.HALF_L - 1.2, ag.pos.z));

      const spdNow = Math.hypot(ag.vel.x, ag.vel.z);
      if (duty === 'FIRST_DEFENDER' && distToBall < 4.2) {
        // Postura de Jockey olhando de frente para a bola!
        ag.facingYaw +=
          shortestYawDiff(ag.facingYaw, Math.atan2(ball.pos.x - ag.pos.x, ball.pos.z - ag.pos.z)) *
          Math.min(1, 14 * dt);
      } else if (spdNow > 0.5) {
        ag.facingYaw +=
          shortestYawDiff(ag.facingYaw, Math.atan2(ag.vel.x, ag.vel.z)) * Math.min(1, 11 * dt);
      } else {
        ag.facingYaw +=
          shortestYawDiff(ag.facingYaw, Math.atan2(ball.pos.x - ag.pos.x, ball.pos.z - ag.pos.z)) *
          Math.min(1, 7 * dt);
      }

      // 4. Bote / Desarme Limpo quando um adversário tenta passar por dentro do alcance do marcador!
      const oppHasBall =
        ball.ownerId !== null &&
        ball.ownerId !== 'HOME_GK' &&
        ball.ownerId !== 'AWAY_GK' &&
        (ag.teamSide === 'HOME'
          ? ball.ownerId.startsWith('AWAY_')
          : ball.ownerId === 'USER' || ball.ownerId.startsWith('HOME_'));

      if (
        oppHasBall &&
        ag.tackleCooldown <= 0 &&
        ball.touchCooldown <= 0 &&
        distToBall < (duty === 'FIRST_DEFENDER' ? 1.28 : 0.98)
      ) {
        ag.tackleCooldown = 1.05;
        ag.kickAnimTimer = 0.22;
        const tackleSkill = ag.profile.attributes.tackling / 99;
        // Contra o usuário dá uma margem justa de proteção de bola se você não trombar de frente!
        const winChance =
          ball.ownerId === 'USER' ? 0.38 + tackleSkill * 0.28 : 0.52 + tackleSkill * 0.32;

        if (Math.random() < winChance) {
          ball.ownerId = ag.id;
          ball.lastTouchBy = ag.id;
          ball.lastTouchTeam = ag.teamSide;
          ball.touchCooldown = 0.28;
          ball.spin.set(0, 0, 0);
          ag.carryTime = 0;
          ag.decisionTimer = 0.16;
          ag.minHoldTime = 0.25;
          playBallKickSfx(0.42);
        }
      }
    }

    ag.actor.root.position.copy(ag.pos);
    ag.actor.root.rotation.y = ag.facingYaw;
    const renderSpd = Math.hypot(ag.vel.x, ag.vel.z);
    const pose: PitchPoseState =
      ag.slideTimer > 0
        ? 'SLIDE'
        : ag.kickAnimTimer > 0
          ? 'KICK'
          : renderSpd > 0.22
            ? 'RUN'
            : 'IDLE';

    animatePitchActor(
      ag.actor,
      pose,
      renderSpd,
      0,
      ag.profile.preferredFoot === 'ESQUERDA',
      dt,
      timeSec,
    );
  }

  return events;
}
