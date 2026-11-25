import * as THREE from 'three';
import { BALL_AERO, BallState } from '../physics/ballPhysics';
import { PITCH } from '../physics/pitchConstants';
import {
  computeElasticSlotAnchor,
  TacticalFormationSpec,
  TacticalSlotSpec,
} from './tacticalFormations';

export type AgentTacticalDuty =
  | 'CARRIER'
  | 'FETCH_LOOSE'
  | 'FIRST_DEFENDER'
  | 'SECOND_DEFENDER'
  | 'SUPPORT_TRIANGLE'
  | 'DEPTH_RUNNER'
  | 'ZONAL_ANCHOR';

export interface TacticalParticipantSnapshot {
  id: string;
  isUser: boolean;
  slot: TacticalSlotSpec;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  maxSprintSpeed: number;
}

export interface AssignedAgentDirective {
  duty: AgentTacticalDuty;
  targetPos: THREE.Vector3;
  urgency01: number;
}

export interface TeamTacticalCoordinatorState {
  teamSide: 'HOME' | 'AWAY';
  /** -1 = Ataca Gol Norte (-Z); +1 = Ataca Gol Sul (+Z) */
  attackDir: -1 | 1;
  formation: TacticalFormationSpec;
  smoothBallPos: THREE.Vector3;
  possessionBlend: number; // 0 = Defesa compacta, 1 = Ataque posicional
  lastPossessionHoldTimer: number;
  defensiveLineProgress: number; // Em progresso (-0.72 .. -0.02)
  firstDefenderId: string | null;
  secondDefenderId: string | null;
  fetcherId: string | null;
  lockedPassReceiverId: string | null;
  lockedPassTimer: number;
  depthRunnerId: string | null;
  depthRunTarget: THREE.Vector3;
  depthRunTimer: number;
  directives: Map<string, AssignedAgentDirective>;
}

const tmpAnchor = new THREE.Vector3();
const tmpSpot = new THREE.Vector3();

export function createTeamTacticalCoordinator(
  teamSide: 'HOME' | 'AWAY',
  attackDir: -1 | 1,
  formation: TacticalFormationSpec,
): TeamTacticalCoordinatorState {
  return {
    teamSide,
    attackDir,
    formation,
    smoothBallPos: new THREE.Vector3(0, 0, 0),
    possessionBlend: teamSide === 'HOME' ? 0.65 : 0.35,
    lastPossessionHoldTimer: 0,
    defensiveLineProgress: -0.52,
    firstDefenderId: null,
    secondDefenderId: null,
    fetcherId: null,
    lockedPassReceiverId: null,
    lockedPassTimer: 0,
    depthRunnerId: null,
    depthRunTarget: new THREE.Vector3(),
    depthRunTimer: 0,
    directives: new Map(),
  };
}

/**
 * Simula a trajetória futura da bola solta/passe e retorna o ponto e tempo de interceptação mais rápido do atleta!
 */
export function computeInterceptPointAndTTI(
  ball: BallState,
  agentPos: THREE.Vector3,
  agentSpeed: number,
): { point: THREE.Vector3; tti: number } {
  let px = ball.pos.x;
  let py = ball.pos.y;
  let pz = ball.pos.z;
  let vx = ball.vel.x;
  let vy = ball.vel.y;
  let vz = ball.vel.z;
  const stepDt = 0.08;

  let bestX = px;
  let bestZ = pz;
  let bestTti = Math.hypot(px - agentPos.x, pz - agentPos.z) / Math.max(4.5, agentSpeed);

  for (let i = 1; i <= 28; i++) {
    const t = i * stepDt;
    if (py > PITCH.BALL_RADIUS + 0.02 || vy > 0.05) {
      vy += BALL_AERO.GRAVITY * stepDt;
      const drag = 1 - BALL_AERO.AIR_DRAG * stepDt;
      vx *= drag;
      vy *= drag;
      vz *= drag;
      py += vy * stepDt;
      if (py < PITCH.BALL_RADIUS) {
        py = PITCH.BALL_RADIUS;
        vy = -vy * BALL_AERO.GRASS_RESTITUTION;
        vx *= 0.88;
        vz *= 0.88;
      }
    } else {
      const sp = Math.hypot(vx, vz);
      if (sp > 0.05) {
        const drop = Math.max(0, sp - BALL_AERO.GRASS_FRICTION * stepDt);
        const r = drop / sp;
        vx *= r;
        vz *= r;
      }
    }

    px = Math.max(-PITCH.HALF_W + 0.8, Math.min(PITCH.HALF_W - 0.8, px + vx * stepDt));
    pz = Math.max(-PITCH.HALF_L + 1.0, Math.min(PITCH.HALF_L - 1.0, pz + vz * stepDt));

    bestX = px;
    bestZ = pz;
    const runTime = Math.hypot(px - agentPos.x, pz - agentPos.z) / Math.max(4.5, agentSpeed);
    bestTti = Math.max(t, runTime);

    // Só intercepta bolas aéreas quando elas já baixaram para alcance de peito/cabeça (< 2.05m)!
    if (py <= 2.05 && runTime <= t + 0.06) {
      return { point: new THREE.Vector3(bestX, 0, bestZ), tti: t };
    }
  }

  return { point: new THREE.Vector3(bestX, 0, bestZ), tti: bestTti };
}

function pointToSegmentDist2D(
  px: number,
  pz: number,
  ax: number,
  az: number,
  bx: number,
  bz: number,
): number {
  const abx = bx - ax;
  const abz = bz - az;
  const lenSq = abx * abx + abz * abz;
  if (lenSq < 1e-4) return Math.hypot(px - ax, pz - az);
  const t = Math.max(0, Math.min(1, ((px - ax) * abx + (pz - az) * abz) / lenSq));
  return Math.hypot(px - (ax + abx * t), pz - (az + abz * t));
}

function teamOwnsActorId(teamSide: 'HOME' | 'AWAY', ownerId: string | null): boolean {
  if (!ownerId) return false;
  if (teamSide === 'HOME') {
    return ownerId === 'USER' || ownerId === 'MATE' || ownerId.startsWith('HOME_');
  }
  return ownerId.startsWith('AWAY_');
}

/**
 * Descobre a linha de impedimento adversária (progresso 0..0.95 na perspectiva de quem ataca)
 * olhando o jogador de linha mais recuado da equipe rival!
 */
export function computeOpponentOffsideLineProgress(
  attackDir: -1 | 1,
  opponents: TacticalParticipantSnapshot[],
): number {
  let deepestProg = 0.35;
  for (const opp of opponents) {
    const prog = (opp.pos.z * attackDir) / PITCH.HALF_L;
    if (prog > deepestProg) deepestProg = prog;
  }
  return Math.max(0.02, Math.min(0.9, deepestProg));
}

/**
 * Atualiza o cérebro coletivo do time (histerese da bola, linha defensiva sincronizada,
 * First Defender + Cover Shadow sem amontoar, Support Spots em triângulo e corridas em profundidade)!
 */
export function stepTeamTacticalCoordinator(
  coord: TeamTacticalCoordinatorState,
  ball: BallState,
  teammates: TacticalParticipantSnapshot[],
  opponents: TacticalParticipantSnapshot[],
  forceTeamPressHeld: boolean,
  dt: number,
): void {
  // 1. Filtro passa-baixa na posição da bola (Histerese anti-tremida nas âncoras!)
  const ballSmoothAlpha = 1 - Math.exp(-dt * 1.65);
  coord.smoothBallPos.x += (ball.pos.x - coord.smoothBallPos.x) * ballSmoothAlpha;
  coord.smoothBallPos.z += (ball.pos.z - coord.smoothBallPos.z) * ballSmoothAlpha;

  if (coord.lockedPassTimer > 0) {
    coord.lockedPassTimer = Math.max(0, coord.lockedPassTimer - dt);
    if (coord.lockedPassTimer <= 0 || ball.ownerId !== null) {
      coord.lockedPassReceiverId = null;
    }
  }

  // 2. Estado de Posse do Time com histerese de transição (0.85s)
  const directOwn = teamOwnsActorId(coord.teamSide, ball.ownerId);
  const directOpp =
    ball.ownerId !== null && !directOwn;

  if (directOwn) {
    coord.lastPossessionHoldTimer = 1.1;
  } else if (directOpp) {
    coord.lastPossessionHoldTimer = 0;
  } else if (ball.lastTouchTeam === coord.teamSide) {
    coord.lastPossessionHoldTimer = Math.max(coord.lastPossessionHoldTimer, 0.55);
  } else {
    coord.lastPossessionHoldTimer = Math.max(0, coord.lastPossessionHoldTimer - dt);
  }

  const teamInAttack = directOwn || (!directOpp && coord.lastPossessionHoldTimer > 0.15);
  const targetBlend = teamInAttack ? 1 : 0;
  coord.possessionBlend +=
    (targetBlend - coord.possessionBlend) * Math.min(1, dt * 1.45);

  // 3. Altura Sincronizada da Linha Defensiva (acompanha contra-ataques rápidos sem deixar avenida!)
  const ballProg = (coord.smoothBallPos.z * coord.attackDir) / PITCH.HALF_L;
  const liveBallProg = (ball.pos.z * coord.attackDir) / PITCH.HALF_L;
  const effectiveDefProg = teamInAttack ? ballProg : Math.min(ballProg, liveBallProg);
  const desiredDefLineProg = teamInAttack
    ? Math.max(-0.52, Math.min(-0.06, -0.35 + effectiveDefProg * 0.34))
    : Math.max(-0.74, Math.min(-0.22, -0.5 + effectiveDefProg * 0.38));

  const maxLineShift = (11.5 / PITCH.HALF_L) * dt;
  const lineDelta = desiredDefLineProg - coord.defensiveLineProgress;
  coord.defensiveLineProgress += Math.max(-maxLineShift, Math.min(maxLineShift, lineDelta));

  const oppOffsideProg = computeOpponentOffsideLineProgress(coord.attackDir, opponents);

  // Pré-calcula a Âncora Elástica de cada jogador do time
  const baseAnchors = new Map<string, THREE.Vector3>();
  for (const tm of teammates) {
    const anc = computeElasticSlotAnchor(
      tm.slot,
      coord.attackDir,
      coord.smoothBallPos,
      coord.possessionBlend,
      coord.defensiveLineProgress,
      oppOffsideProg,
      tmpAnchor,
    ).clone();
    baseAnchors.set(tm.id, anc);
  }

  coord.directives.clear();
  coord.fetcherId = null;

  // 4. BOLA SOLTA / PASSE EM CURSO -> Designa APENAS 1 buscador por time pelo menor TTI!
  if (ball.ownerId === null) {
    let bestId: string | null = null;
    let bestScore = Infinity;
    let bestPoint = new THREE.Vector3(ball.pos.x, 0, ball.pos.z);

    if (coord.lockedPassReceiverId) {
      const locked = teammates.find((t) => t.id === coord.lockedPassReceiverId);
      if (locked) {
        const res = computeInterceptPointAndTTI(ball, locked.pos, locked.maxSprintSpeed);
        bestId = locked.id;
        bestPoint = res.point;
        bestScore = -999;
      }
    }

    if (!bestId) {
      for (const tm of teammates) {
        const res = computeInterceptPointAndTTI(ball, tm.pos, tm.maxSprintSpeed);
        // Pequeno bônus para o usuário se estiver praticamente empatado na corrida pela bola!
        const score = res.tti - (tm.isUser ? 0.14 : 0);
        if (score < bestScore) {
          bestScore = score;
          bestId = tm.id;
          bestPoint = res.point;
        }
      }
    }

    coord.fetcherId = bestId;
    if (bestId) {
      coord.directives.set(bestId, {
        duty: 'FETCH_LOOSE',
        targetPos: bestPoint,
        urgency01: 1.0,
      });
    }
  }

  // 5. FASE COM POSSE DE BOLA: Portador + Triângulo de Apoio (Support Spots) + Corrida em Profundidade!
  if (teamInAttack) {
    coord.firstDefenderId = null;
    coord.secondDefenderId = null;

    const carrier =
      teammates.find((t) => t.id === ball.ownerId) ??
      (coord.fetcherId ? teammates.find((t) => t.id === coord.fetcherId) : null);

    if (carrier && carrier.id === ball.ownerId) {
      coord.directives.set(carrier.id, {
        duty: 'CARRIER',
        targetPos: carrier.pos.clone(),
        urgency01: 1.0,
      });
    }

    const refPos = carrier ? carrier.pos : ball.pos;

    // 5A. Seleciona 2 companheiros próximos (não-portadores e não-USER) para abrir linhas limpas de passe (Support Spots!)
    const supportCandidates = teammates
      .filter((t) => !t.isUser && !coord.directives.has(t.id))
      .map((t) => {
        const anc = baseAnchors.get(t.id)!;
        const dCarrier = Math.hypot(anc.x - refPos.x, anc.z - refPos.z);
        return { tm: t, anc, dCarrier };
      })
      .sort((a, b) => a.dCarrier - b.dCarrier)
      .slice(0, 3);

    supportCandidates.forEach(({ tm, anc }, idx) => {
      // Testa 5 micro-ajustes ao redor da âncora para fugir da "Cover Shadow" dos marcadores e criar triângulo!
      let bestSpot = anc.clone();
      let bestSpotScore = -999;

      const offsets: [number, number][] = [
        [0, 0],
        [-5.5, coord.attackDir * 4.5],
        [5.5, coord.attackDir * 4.5],
        [idx % 2 === 0 ? -7.0 : 7.0, -coord.attackDir * 4.0],
        [0, coord.attackDir * 7.5],
      ];

      for (const [ox, oz] of offsets) {
        const sx = Math.max(-PITCH.HALF_W + 3, Math.min(PITCH.HALF_W - 3, anc.x + ox));
        const sz = Math.max(-PITCH.HALF_L + 5.5, Math.min(PITCH.HALF_L - 5.5, anc.z + oz));
        const distToCarrier = Math.hypot(sx - refPos.x, sz - refPos.z);

        // Distância ideal de tabela/apoio: entre 8.5m e 21m (nunca se amontoa em cima do portador!)
        let score =
          distToCarrier < 6.5
            ? -25
            : distToCarrier <= 21
              ? 18 - Math.abs(distToCarrier - 13.5) * 0.8
              : 10 - (distToCarrier - 21) * 0.6;

        // Voronoi Space + Penalidade severa de Cover Shadow se um rival estiver no meio da linha de passe!
        let nearestOpp = 99;
        for (const opp of opponents) {
          const dOpp = Math.hypot(opp.pos.x - sx, opp.pos.z - sz);
          if (dOpp < nearestOpp) nearestOpp = dOpp;

          const laneDist = pointToSegmentDist2D(
            opp.pos.x,
            opp.pos.z,
            refPos.x,
            refPos.z,
            sx,
            sz,
          );
          if (laneDist < 2.2) {
            score -= (2.2 - laneDist) * 12;
          }
        }
        score += Math.min(12, nearestOpp * 1.35);

        // Respeita a linha de impedimento
        const spotProg = (sz * coord.attackDir) / PITCH.HALF_L;
        if (spotProg > oppOffsideProg - 0.015) {
          score -= 30;
        }

        if (score > bestSpotScore) {
          bestSpotScore = score;
          bestSpot = tmpSpot.set(sx, 0, sz).clone();
        }
      }

      coord.directives.set(tm.id, {
        duty: 'SUPPORT_TRIANGLE',
        targetPos: bestSpot,
        urgency01: 0.72,
      });
    });

    // 5B. Aciona 1 infiltração em profundidade (`DEPTH_RUNNER`) nas costas da zaga!
    if (coord.depthRunTimer > 0) {
      coord.depthRunTimer = Math.max(0, coord.depthRunTimer - dt);
      if (coord.depthRunTimer <= 0) coord.depthRunnerId = null;
    }

    const carrierProg = (refPos.z * coord.attackDir) / PITCH.HALF_L;
    if (coord.depthRunTimer <= 0 && carrierProg > -0.18 && carrierProg < 0.68) {
      const runners = teammates.filter(
        (t) =>
          !t.isUser &&
          t.id !== carrier?.id &&
          (t.slot.line === 'FWD' || (t.slot.line === 'MID' && !t.slot.holdingAnchor)),
      );
      if (runners.length > 0) {
        // Escolhe o atacante/meia mais livre para atacar as costas da linha defensiva!
        let chosen = runners[0];
        let bestOpenness = -1;
        for (const r of runners) {
          let minOpp = 99;
          for (const opp of opponents) {
            minOpp = Math.min(minOpp, Math.hypot(opp.pos.x - r.pos.x, opp.pos.z - r.pos.z));
          }
          if (minOpp > bestOpenness) {
            bestOpenness = minOpp;
            chosen = r;
          }
        }
        const anc = baseAnchors.get(chosen.id)!;
        const targetProg = Math.min(0.88, oppOffsideProg + 0.09);
        const runX = Math.max(-PITCH.HALF_W + 5, Math.min(PITCH.HALF_W - 5, anc.x * 0.78));
        const runZ = targetProg * coord.attackDir * PITCH.HALF_L;
        coord.depthRunnerId = chosen.id;
        coord.depthRunTarget.set(runX, 0, runZ);
        coord.depthRunTimer = 2.1;
      }
    }

    if (
      coord.depthRunnerId &&
      coord.depthRunnerId !== carrier?.id &&
      coord.depthRunnerId !== coord.fetcherId
    ) {
      coord.directives.set(coord.depthRunnerId, {
        duty: 'DEPTH_RUNNER',
        targetPos: coord.depthRunTarget.clone(),
        urgency01: 0.95,
      });
    }
  } else {
    // 6. FASE SEM BOLA (DEFESA ORGANIZADA):
    // - APENAS 1 `FIRST_DEFENDER` dá o combate/contenção no portador da bola!
    // - APENAS 1 `SECOND_DEFENDER` fecha a sombra de passe central (ou dobra marcação se RB segurado)!
    // - Todos os demais mantêm o Bloco Zonal + Balanço + Linha de Impedimento (ZERO correria em bando!)
    coord.depthRunnerId = null;
    coord.depthRunTimer = 0;

    const ballCarrierOpp = opponents.find((o) => o.id === ball.ownerId);
    const threatPos = ballCarrierOpp ? ballCarrierOpp.pos : ball.pos;
    const threatVel = ballCarrierOpp ? ballCarrierOpp.vel : ball.vel;
    const distThreatFromOwnGoal = Math.abs(
      -coord.attackDir * PITCH.HALF_L - threatPos.z,
    );

    let bestPresserId: string | null = null;
    let bestPresserCost = Infinity;

    for (const tm of teammates) {
      if (tm.isUser || coord.directives.has(tm.id)) continue;
      // Antecipa 0.32s da corrida do portador para escolher quem fecha a frente dele (não quem corre atrás!)
      const leadX = threatPos.x + threatVel.x * 0.32;
      const leadZ = threatPos.z + threatVel.z * 0.32;
      const dBall = Math.hypot(tm.pos.x - leadX, tm.pos.z - leadZ);
      const anc = baseAnchors.get(tm.id)!;
      const dAnchor = Math.hypot(anc.x - threatPos.x, anc.z - threatPos.z);

      // Penaliza quem já ficou ultrapassado nas costas do driblador, forçando o próximo defensor da frente a dar o bote!
      const ownGoalZ = -coord.attackDir * PITCH.HALF_L;
      const tmDistToOwnGoal = Math.abs(ownGoalZ - tm.pos.z);
      const carrierDistToOwnGoal = Math.abs(ownGoalZ - threatPos.z);
      const beatenBehindPenalty = tmDistToOwnGoal > carrierDistToOwnGoal + 2.2 ? 9.5 : 0;

      const isCenterBack = tm.slot.roleLabel === 'ZAG';
      const cbOutPenalty = isCenterBack && distThreatFromOwnGoal > 32.0 ? 11.0 : 0;

      const hysteresis = tm.id === coord.firstDefenderId ? -1.8 : 0;
      const cost = dBall * 0.78 + dAnchor * 0.25 + beatenBehindPenalty + cbOutPenalty + hysteresis;

      if (cost < bestPresserCost) {
        bestPresserCost = cost;
        bestPresserId = tm.id;
      }
    }

    coord.firstDefenderId = bestPresserId;
    if (bestPresserId) {
      // Ponto de Combate Agressivo: fecha exatamente a linha de progressão entre a bola e o gol (0.55m à frente do pé da bola!)
      const ownGoalZ = -coord.attackDir * PITCH.HALF_L;
      const predX = threatPos.x + threatVel.x * 0.26;
      const predZ = threatPos.z + threatVel.z * 0.26;
      const toOwnGoalX = 0 - predX;
      const toOwnGoalZ = ownGoalZ - predZ;
      const toGoalLen = Math.max(1, Math.hypot(toOwnGoalX, toOwnGoalZ));
      const tackleOffset = 0.52;

      coord.directives.set(bestPresserId, {
        duty: 'FIRST_DEFENDER',
        targetPos: new THREE.Vector3(
          predX + (toOwnGoalX / toGoalLen) * tackleOffset,
          0,
          predZ + (toOwnGoalZ / toGoalLen) * tackleOffset,
        ),
        urgency01: 1.0,
      });
    }

    // Escolhe `SECOND_DEFENDER`: no terço defensivo (< 32m do gol) ou com RB segurado, fecha junto na diagonal pra trancar a passagem!
    let bestCoverId: string | null = null;
    let bestCoverCost = Infinity;
    for (const tm of teammates) {
      if (tm.isUser || coord.directives.has(tm.id)) continue;
      const dBall = Math.hypot(tm.pos.x - threatPos.x, tm.pos.z - threatPos.z);
      const hysteresis = tm.id === coord.secondDefenderId ? -1.8 : 0;
      const cost = dBall + hysteresis;
      if (cost < bestCoverCost) {
        bestCoverCost = cost;
        bestCoverId = tm.id;
      }
    }

    coord.secondDefenderId = bestCoverId;
    if (bestCoverId) {
      const anc = baseAnchors.get(bestCoverId)!;
      if (forceTeamPressHeld || distThreatFromOwnGoal < 30.0) {
        const insideX = threatPos.x * 0.82;
        const coverGoalZ = threatPos.z - coord.attackDir * (forceTeamPressHeld ? 1.1 : 2.6);
        coord.directives.set(bestCoverId, {
          duty: 'SECOND_DEFENDER',
          targetPos: new THREE.Vector3(insideX, 0, coverGoalZ),
          urgency01: 0.96,
        });
      } else {
        const dangerousReceiver = opponents
          .filter((o) => o.id !== ball.ownerId)
          .sort(
            (a, b) =>
              Math.hypot(a.pos.x - anc.x, a.pos.z - anc.z) -
              Math.hypot(b.pos.x - anc.x, b.pos.z - anc.z),
          )[0];

        const shadowX = dangerousReceiver
          ? threatPos.x * 0.52 + dangerousReceiver.pos.x * 0.48
          : threatPos.x * 0.75;
        const shadowZ = threatPos.z - coord.attackDir * 5.2;

        coord.directives.set(bestCoverId, {
          duty: 'SECOND_DEFENDER',
          targetPos: new THREE.Vector3(
            anc.x * 0.3 + shadowX * 0.7,
            0,
            anc.z * 0.3 + shadowZ * 0.7,
          ),
          urgency01: 0.85,
        });
      }
    }
  }

  // 7. Todos os demais atletas assumem sua Âncora Zonal Elástica (com leve ajuste de marcação zonal na defesa!)
  for (const tm of teammates) {
    if (tm.isUser || coord.directives.has(tm.id)) continue;
    const anc = baseAnchors.get(tm.id)!.clone();

    if (!teamInAttack && (tm.slot.line === 'DEF' || tm.slot.holdingAnchor)) {
      // Marcação Zonal Inteligente: se um atacante rival entrou na zona deste defensor (< 9.5m), cola 45% nele pelo lado do gol!
      let closestAttacker: TacticalParticipantSnapshot | null = null;
      let minD = 9.5;
      for (const opp of opponents) {
        if (opp.id === ball.ownerId) continue;
        const d = Math.hypot(opp.pos.x - anc.x, opp.pos.z - anc.z);
        if (d < minD) {
          minD = d;
          closestAttacker = opp;
        }
      }
      if (closestAttacker) {
        const goalSideZ = closestAttacker.pos.z - coord.attackDir * 1.65;
        anc.x = anc.x * 0.55 + closestAttacker.pos.x * 0.45;
        anc.z =
          tm.slot.line === 'DEF'
            ? anc.z * 0.62 + goalSideZ * 0.38
            : anc.z * 0.55 + goalSideZ * 0.45;
      }
    }

    coord.directives.set(tm.id, {
      duty: 'ZONAL_ANCHOR',
      targetPos: anc,
      urgency01: 0.62,
    });
  }
}
