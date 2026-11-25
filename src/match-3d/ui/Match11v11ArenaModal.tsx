import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { ClubData, FullSquadPlayer } from '../../data/clubs/types';
import { AnyCompetitionId, getCompetitionTheme } from '../../data/world/competitionThemes';
import { loadClubFullSquad } from '../../data/world/squadLoader';
import { CareerPlayer } from '../../domains/player/playerTypes';
import { resolvePrimaryRivalForClub } from '../../domains/rivalry/resolvePrimaryRival';
import { buildTeamMatchLineup } from '../../features/career-hub/match-day/buildMatchLineup';
import { createGoalkeeperAI, stepGoalkeeperAI } from '../actors/goalkeeperAI';
import {
  animatePitchActor,
  createPitchFootballerActor,
  PitchPoseState,
} from '../actors/pitchActorRig';
import {
  createOutfieldAgentsForTeam,
  selectBestTeammateForUserKick,
  stepOutfieldAgentsTeam,
} from '../ai/outfieldAgentAI';
import {
  computeKickoffSlotPosition,
  findBestSlotIndexForPosition,
  selectClubTacticalFormation,
} from '../ai/tacticalFormations';
import {
  createTeamTacticalCoordinator,
  stepTeamTacticalCoordinator,
  TacticalParticipantSnapshot,
} from '../ai/teamCoordinatorAI';
import {
  playBallKickSfx,
  playGoalRoarSfx,
  playPostClangSfx,
  playWhistleSfx,
} from '../audio/matchAudio';
import { PitchInputCollector } from '../input/usePitchInput';
import { createInitialBallState, stepBallPhysics } from '../physics/ballPhysics';
import { PITCH } from '../physics/pitchConstants';
import {
  createInitialPlayerPitchState,
  stepPlayerAndBallControl,
} from '../physics/playerLocomotion';
import { buildStadium3D } from '../stadium/buildStadium3D';
import {
  Match11v11HudOverlay,
  Match11v11HudSnapshot,
  MatchCameraPreset,
  RadarDotSnapshot,
} from './Match11v11HudOverlay';

interface Match11v11ArenaModalProps {
  player: CareerPlayer;
  club: ClubData;
  competitionId?: AnyCompetitionId;
  onExit: () => void;
}

const CAMERA_CYCLE: MatchCameraPreset[] = ['PRO_TACTICAL', 'PRO_CLOSE', 'BROADCAST_TV'];

function shortestYawDelta(from: number, to: number): number {
  let d = ((to - from + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export const Match11v11ArenaModal: React.FC<Match11v11ArenaModalProps> = ({
  player,
  club,
  competitionId,
  onExit,
}) => {
  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const derby = useMemo(() => resolvePrimaryRivalForClub(club), [club]);
  const compTheme = getCompetitionTheme(competitionId ?? club.leagueId);

  const [loadedSquads, setLoadedSquads] = useState<{
    home: FullSquadPlayer[];
    away: FullSquadPlayer[];
  } | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      loadClubFullSquad(derby.homeClub.id),
      loadClubFullSquad(derby.rivalClub.id),
    ]).then(([home, away]) => {
      if (active) setLoadedSquads({ home, away });
    });
    return () => {
      active = false;
    };
  }, [derby.homeClub.id, derby.rivalClub.id]);

  const homeFormation = useMemo(
    () => selectClubTacticalFormation(derby.homeClub, player.position),
    [derby.homeClub, player.position],
  );
  const awayFormation = useMemo(
    () => selectClubTacticalFormation(derby.rivalClub, null),
    [derby.rivalClub],
  );

  const initialCap = Math.max(25, Math.min(100, player.stamina));
  const [hud, setHud] = useState<Match11v11HudSnapshot>({
    homeGoals: 0,
    awayGoals: 0,
    userGoals: 0,
    userAssists: 0,
    matchMinute: 0,
    matchSecond: 0,
    half: 1,
    stamina: initialCap,
    maxStamina: initialCap,
    powerPct: 0,
    teamPossession: 'HOME',
    userHasBall: false,
    cameraPreset: 'PRO_TACTICAL',
    homeFormationLabel: homeFormation.id,
    awayFormationLabel: awayFormation.id,
    bannerFeedback: {
      text: `${derby.derbyName}`,
      subtext: `${derby.homeClub.name.toUpperCase()} × ${derby.rivalClub.name.toUpperCase()} • 11v11`,
      color: compTheme.accentPrimary,
    },
    ballX: 0,
    ballZ: 0,
    radarDots: [],
  });

  const cycleCameraRef = useRef<(() => void) | null>(null);
  const restartMatchRef = useRef<(() => void) | null>(null);
  const callbacksRef = useRef({ onExit, player });
  callbacksRef.current = { onExit, player };

  useEffect(() => {
    const host = canvasHostRef.current;
    if (!host || !loadedSquads) return;

    const activePlayer = callbacksRef.current.player;
    const homeClub = derby.homeClub;
    const rivalClub = derby.rivalClub;
    const awayRenderClub = derby.awayRenderClub;

    const homeLineup = buildTeamMatchLineup(loadedSquads.home, activePlayer, 'TITULAR', true);
    const awayLineup = buildTeamMatchLineup(loadedSquads.away, null, null, false);

    playWhistleSfx(false);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#071226');
    scene.fog = new THREE.FogExp2('#071226', 0.0036);

    const camera = new THREE.PerspectiveCamera(52, 1, 0.2, 340);
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.domElement.style.display = 'block';
    host.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight('#E0F2FE', '#14532D', 1.28));
    const floodMain = new THREE.DirectionalLight('#FFFBEB', 1.75);
    floodMain.position.set(24, 42, 28);
    scene.add(floodMain);
    const floodRim = new THREE.DirectionalLight('#60A5FA', 0.85);
    floodRim.position.set(-28, 34, -40);
    scene.add(floodRim);

    const stadium = buildStadium3D(homeClub, compTheme, rivalClub, derby.derbyName);
    scene.add(stadium.root);

    // 1. Cria os 22 Atletas Reais em Campo (Você + 9 Linha Casa + GK Casa + 10 Linha Rival + GK Rival)
    const userSlotIdx = findBestSlotIndexForPosition(homeFormation, activePlayer.position);
    const userSlotSpec = homeFormation.outfieldSlots[userSlotIdx];
    const userActor = createPitchFootballerActor(activePlayer, homeClub);
    scene.add(userActor.root);

    const homeAgents = createOutfieldAgentsForTeam(
      'HOME',
      -1,
      homeClub,
      homeFormation,
      homeLineup.starters,
      userSlotIdx,
    );
    homeAgents.forEach((a) => scene.add(a.actor.root));

    const awayAgents = createOutfieldAgentsForTeam(
      'AWAY',
      1,
      awayRenderClub,
      awayFormation,
      awayLineup.starters,
      null,
    );
    awayAgents.forEach((a) => scene.add(a.actor.root));

    const homeGkStarter = homeLineup.starters.find((s) => s.slotLabel === 'GK');
    const awayGkStarter = awayLineup.starters.find((s) => s.slotLabel === 'GK');

    const homeGk = createGoalkeeperAI(homeClub, {
      goalSideSign: 1,
      ownerTag: 'HOME_GK',
      teamSide: 'HOME',
      kitColor: '#10B981',
      fullName: homeGkStarter?.displayName ?? 'Goleiro Casa',
      shirtName: homeGkStarter?.displayName ?? 'GOLEIRO',
      jersey: homeGkStarter?.jersey ?? 1,
      ovr: homeGkStarter?.ovr ?? homeClub.squadAvgOvr,
    });
    scene.add(homeGk.actor.root);

    const awayGk = createGoalkeeperAI(awayRenderClub, {
      goalSideSign: -1,
      ownerTag: 'AWAY_GK',
      teamSide: 'AWAY',
      kitColor: '#F59E0B',
      fullName: awayGkStarter?.displayName ?? 'Goleiro Rival',
      shirtName: awayGkStarter?.displayName ?? 'GOLEIRO',
      jersey: awayGkStarter?.jersey ?? 1,
      ovr: awayGkStarter?.ovr ?? rivalClub.squadAvgOvr,
    });
    scene.add(awayGk.actor.root);

    // 2. Indicadores Visuais 3D na Grama (Seu Círculo Dourado, Portador da Bola e Alvo de Passe!)
    const ringGeo = new THREE.RingGeometry(0.54, 0.72, 36);
    const userRingMat = new THREE.MeshBasicMaterial({
      color: '#FACC15',
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9,
    });
    const userRing = new THREE.Mesh(ringGeo, userRingMat);
    userRing.rotation.x = -Math.PI / 2;
    userRing.position.y = 0.03;
    scene.add(userRing);

    const carrierRingGeo = new THREE.RingGeometry(0.48, 0.62, 32);
    const carrierRingMat = new THREE.MeshBasicMaterial({
      color: '#2DBE60',
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.72,
    });
    const carrierRing = new THREE.Mesh(carrierRingGeo, carrierRingMat);
    carrierRing.rotation.x = -Math.PI / 2;
    carrierRing.position.y = 0.025;
    scene.add(carrierRing);

    const passTargetRingGeo = new THREE.RingGeometry(0.62, 0.74, 28);
    const passTargetRingMat = new THREE.MeshBasicMaterial({
      color: '#38BDF8',
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.58,
    });
    const passTargetRing = new THREE.Mesh(passTargetRingGeo, passTargetRingMat);
    passTargetRing.rotation.x = -Math.PI / 2;
    passTargetRing.position.y = 0.024;
    passTargetRing.visible = false;
    scene.add(passTargetRing);

    // 3. Coordenadores Táticos das 2 Equipes + Física da Bola e do Jogador
    const homeCoord = createTeamTacticalCoordinator('HOME', -1, homeFormation);
    const awayCoord = createTeamTacticalCoordinator('AWAY', 1, awayFormation);

    const ball = createInitialBallState(0, 0);
    const pState = createInitialPlayerPitchState(activePlayer.stamina);
    const inputCollector = new PitchInputCollector();
    inputCollector.attach(host);

    const actorNameMap = new Map<string, string>();
    actorNameMap.set('USER', `#${activePlayer.shirtNumber} ${activePlayer.shirtName}`);
    actorNameMap.set('HOME_GK', `#${homeGk.jersey} ${homeGk.shirtName}`);
    actorNameMap.set('AWAY_GK', `#${awayGk.jersey} ${awayGk.shirtName}`);
    homeAgents.forEach((a) => actorNameMap.set(a.id, `#${a.jersey} ${a.shirtName}`));
    awayAgents.forEach((a) => actorNameMap.set(a.id, `#${a.jersey} ${a.shirtName}`));

    let homeGoals = 0;
    let awayGoals = 0;
    let userGoals = 0;
    let userAssists = 0;
    let matchClockSeconds = 0; // 0 .. 5400 (90 min * 60s)
    let half: 1 | 2 | 'FT' = 1;

    let cameraPreset: MatchCameraPreset = 'PRO_TACTICAL';
    let camYaw = 0;
    let camPitch = 0.28;
    let manualAimOffsetYaw = 0;
    const smoothCamPos = new THREE.Vector3(0, 4.2, 12);
    const smoothCamLook = new THREE.Vector3(0, 1.0, -8);

    let celebrationTimer = 0;
    let outRestartTimer = 0;
    let pendingOutPos = new THREE.Vector3();
    let bannerTimer = 2.6;
    let bannerObj: { text: string; subtext?: string; color: string } | null = {
      text: derby.derbyName,
      subtext: `${homeClub.name.toUpperCase()} × ${rivalClub.name.toUpperCase()} • APITO INICIAL`,
      color: compTheme.accentPrimary,
    };

    let userQueuedCall: 'PASS' | 'THROUGH' | 'CROSS' | null = null;
    let userQueuedCallTimer = 0;
    let lastHomePasserId: string | null = null;
    let penultimateHomeTouchId: string | null = null;
    let prevBallLastTouch: string | null = null;

    const showBanner = (text: string, color: string, dur = 1.9, subtext?: string) => {
      bannerObj = { text, subtext, color };
      bannerTimer = dur;
    };

    const setupKickoff = (kickingTeam: 'HOME' | 'AWAY') => {
      // Escolhe batedor da saída de bola no círculo central
      const homePrimaryUserKickoff =
        kickingTeam === 'HOME' && (userSlotSpec.line === 'FWD' || userSlotSpec.roleLabel === 'MEI');

      const userStart = computeKickoffSlotPosition(
        userSlotSpec,
        -1,
        kickingTeam === 'HOME',
        homePrimaryUserKickoff,
      );
      pState.pos.copy(userStart);
      pState.vel.set(0, 0, 0);
      pState.facingYaw = Math.PI;
      pState.chargeIntent = null;
      pState.powerCharge01 = 0;
      pState.windupTimer = 0;
      pState.fakeShotAnimTimer = 0;

      // Se o usuário não for atacante, o centroavante da casa bate a saída!
      let assignedHomeKicker = homePrimaryUserKickoff;
      for (const ag of homeAgents) {
        const isKicker =
          kickingTeam === 'HOME' &&
          !assignedHomeKicker &&
          (ag.slot.roleLabel === 'ATA' || ag.slot.line === 'FWD');
        if (isKicker) assignedHomeKicker = true;
        ag.pos.copy(computeKickoffSlotPosition(ag.slot, -1, kickingTeam === 'HOME', isKicker));
        ag.vel.set(0, 0, 0);
        ag.facingYaw = Math.PI;
        ag.carryTime = 0;
      }

      let assignedAwayKicker = false;
      for (const ag of awayAgents) {
        const isKicker =
          kickingTeam === 'AWAY' &&
          !assignedAwayKicker &&
          (ag.slot.roleLabel === 'ATA' || ag.slot.line === 'FWD');
        if (isKicker) assignedAwayKicker = true;
        ag.pos.copy(computeKickoffSlotPosition(ag.slot, 1, kickingTeam === 'AWAY', isKicker));
        ag.vel.set(0, 0, 0);
        ag.facingYaw = 0;
        ag.carryTime = 0;
      }

      homeGk.pos.set(0, 0, PITCH.HALF_L - 0.85);
      homeGk.vel.set(0, 0, 0);
      homeGk.diveTimer = 0;
      awayGk.pos.set(0, 0, -PITCH.HALF_L + 0.85);
      awayGk.vel.set(0, 0, 0);
      awayGk.diveTimer = 0;

      ball.pos.set(0, PITCH.BALL_RADIUS, 0);
      ball.vel.set(0, 0, 0);
      ball.spin.set(0, 0, 0);
      ball.enteredGoalSide = null;
      ball.touchCooldown = 0.15;
      ball.lastTouchTeam = kickingTeam;

      if (kickingTeam === 'HOME') {
        if (homePrimaryUserKickoff) {
          ball.ownerId = 'USER';
          ball.lastTouchBy = 'USER';
        } else {
          const kicker =
            homeAgents.find((a) => Math.hypot(a.pos.x, a.pos.z) < 2.2) ?? homeAgents[0];
          ball.ownerId = kicker ? kicker.id : 'USER';
          ball.lastTouchBy = ball.ownerId;
        }
      } else {
        const kicker = awayAgents.find((a) => Math.hypot(a.pos.x, a.pos.z) < 2.2) ?? awayAgents[0];
        ball.ownerId = kicker.id;
        ball.lastTouchBy = kicker.id;
      }

      homeCoord.smoothBallPos.set(0, 0, 0);
      awayCoord.smoothBallPos.set(0, 0, 0);
      userQueuedCall = null;
      userQueuedCallTimer = 0;
      celebrationTimer = 0;
      outRestartTimer = 0;
    };

    const executeOutOfBoundsRestart = (exitPos: THREE.Vector3) => {
      const receivingTeam: 'HOME' | 'AWAY' = ball.lastTouchTeam === 'HOME' ? 'AWAY' : 'HOME';
      ball.enteredGoalSide = null;
      ball.vel.set(0, 0, 0);
      ball.spin.set(0, 0, 0);
      ball.touchCooldown = 0.25;

      // 1. Saiu pela linha de fundo Norte (-Z, gol do Rival)
      if (exitPos.z < -PITCH.HALF_L + 0.2) {
        if (ball.lastTouchTeam === 'HOME') {
          // Tiro de Meta p/ o Goleiro Visitante!
          awayGk.pos.set(0, 0, -PITCH.HALF_L + 4.2);
          ball.pos.set(0, 1.0, -PITCH.HALF_L + 4.6);
          ball.ownerId = 'AWAY_GK';
          ball.lastTouchBy = 'AWAY_GK';
          ball.lastTouchTeam = 'AWAY';
          awayGk.holdBallTimer = 0.65;
          showBanner('TIRO DE META', '#9498A3', 1.1, rivalClub.shortName);
          return;
        } else {
          // Escanteio p/ o Mandante!
          const cornerX = exitPos.x >= 0 ? PITCH.HALF_W - 0.9 : -PITCH.HALF_W + 0.9;
          const cornerZ = -PITCH.HALF_L + 0.9;
          ball.pos.set(cornerX, PITCH.BALL_RADIUS, cornerZ);
          const taker = [...homeAgents].sort(
            (a, b) =>
              Math.hypot(a.pos.x - cornerX, a.pos.z - cornerZ) -
              Math.hypot(b.pos.x - cornerX, b.pos.z - cornerZ),
          )[0];
          if (taker) {
            taker.pos.set(cornerX - Math.sign(cornerX) * 0.4, 0, cornerZ + 0.4);
            taker.vel.set(0, 0, 0);
            taker.carryTime = 0.35;
            taker.decisionTimer = 0.2;
            ball.ownerId = taker.id;
            ball.lastTouchBy = taker.id;
            ball.lastTouchTeam = 'HOME';
          }
          showBanner('ESCANTEIO A FAVOR!', compTheme.accentPrimary, 1.2, homeClub.shortName);
          return;
        }
      }

      // 2. Saiu pela linha de fundo Sul (+Z, gol da Casa)
      if (exitPos.z > PITCH.HALF_L - 0.2) {
        if (ball.lastTouchTeam === 'AWAY') {
          // Tiro de Meta p/ o Goleiro da Casa!
          homeGk.pos.set(0, 0, PITCH.HALF_L - 4.2);
          ball.pos.set(0, 1.0, PITCH.HALF_L - 4.6);
          ball.ownerId = 'HOME_GK';
          ball.lastTouchBy = 'HOME_GK';
          ball.lastTouchTeam = 'HOME';
          homeGk.holdBallTimer = 0.65;
          showBanner('TIRO DE META', '#2DBE60', 1.1, homeClub.shortName);
          return;
        } else {
          // Escanteio p/ o Visitante!
          const cornerX = exitPos.x >= 0 ? PITCH.HALF_W - 0.9 : -PITCH.HALF_W + 0.9;
          const cornerZ = PITCH.HALF_L - 0.9;
          ball.pos.set(cornerX, PITCH.BALL_RADIUS, cornerZ);
          const taker = [...awayAgents].sort(
            (a, b) =>
              Math.hypot(a.pos.x - cornerX, a.pos.z - cornerZ) -
              Math.hypot(b.pos.x - cornerX, b.pos.z - cornerZ),
          )[0];
          if (taker) {
            taker.pos.set(cornerX - Math.sign(cornerX) * 0.4, 0, cornerZ - 0.4);
            taker.vel.set(0, 0, 0);
            taker.carryTime = 0.35;
            taker.decisionTimer = 0.2;
            ball.ownerId = taker.id;
            ball.lastTouchBy = taker.id;
            ball.lastTouchTeam = 'AWAY';
          }
          showBanner('ESCANTEIO RIVAL!', '#EF4444', 1.2, rivalClub.shortName);
          return;
        }
      }

      // 3. Lateral Rápido na linha lateral!
      const sideX = exitPos.x >= 0 ? PITCH.HALF_W - 1.1 : -PITCH.HALF_W + 1.1;
      const clampedZ = Math.max(-PITCH.HALF_L + 6, Math.min(PITCH.HALF_L - 6, exitPos.z));
      ball.pos.set(sideX, PITCH.BALL_RADIUS, clampedZ);

      const pool = receivingTeam === 'HOME' ? homeAgents : awayAgents;
      const thrower = [...pool].sort(
        (a, b) =>
          Math.hypot(a.pos.x - sideX, a.pos.z - clampedZ) -
          Math.hypot(b.pos.x - sideX, b.pos.z - clampedZ),
      )[0];
      if (thrower) {
        thrower.pos.set(sideX, 0, clampedZ);
        thrower.vel.set(0, 0, 0);
        thrower.carryTime = 0.35;
        thrower.decisionTimer = 0.18;
        ball.ownerId = thrower.id;
        ball.lastTouchBy = thrower.id;
        ball.lastTouchTeam = receivingTeam;
      }
      showBanner(
        `LATERAL • ${receivingTeam === 'HOME' ? homeClub.shortName : rivalClub.shortName}`,
        '#9498A3',
        1.0,
      );
    };

    setupKickoff('HOME');

    cycleCameraRef.current = () => {
      const nextIdx = (CAMERA_CYCLE.indexOf(cameraPreset) + 1) % CAMERA_CYCLE.length;
      cameraPreset = CAMERA_CYCLE[nextIdx];
    };

    restartMatchRef.current = () => {
      homeGoals = 0;
      awayGoals = 0;
      userGoals = 0;
      userAssists = 0;
      matchClockSeconds = 0;
      half = 1;
      pState.stamina = pState.maxStamina;
      playWhistleSfx(false);
      setupKickoff('HOME');
      showBanner(
        derby.derbyName,
        compTheme.accentPrimary,
        2.0,
        `${homeClub.shortName} × ${rivalClub.shortName} • NOVO CLÁSSICO`,
      );
    };

    const syncSize = () => {
      const w = Math.max(320, host.clientWidth);
      const h = Math.max(240, host.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    syncSize();
    const ro = new ResizeObserver(syncSize);
    ro.observe(host);

    let prevMs = performance.now();
    let hudSyncAcc = 0;
    let rafId = 0;

    const tick = (nowMs: number) => {
      const dt = Math.min(0.04, Math.max(0.001, (nowMs - prevMs) * 0.001));
      prevMs = nowMs;
      const timeSec = nowMs * 0.001;

      const inp = inputCollector.sample(dt);

      if (inp.resetBallJustPressed) {
        cycleCameraRef.current?.();
      }
      if (inp.exitOrFinishJustPressed) {
        callbacksRef.current.onExit();
        return;
      }

      if (bannerTimer > 0) {
        bannerTimer -= dt;
        if (bannerTimer <= 0) bannerObj = null;
      }

      // Rastreia histórico de toques p/ contabilizar Assistências reais!
      if (ball.lastTouchBy && ball.lastTouchBy !== prevBallLastTouch) {
        if (ball.lastTouchTeam === 'HOME') {
          penultimateHomeTouchId = lastHomePasserId;
          lastHomePasserId = ball.lastTouchBy;
        } else {
          penultimateHomeTouchId = null;
          lastHomePasserId = null;
        }
        prevBallLastTouch = ball.lastTouchBy;
      }

      // Cronômetro acelerado da partida (1s real = 12s de jogo -> 90 min = 7.5 min reais!)
      if (half !== 'FT' && celebrationTimer <= 0 && outRestartTimer <= 0) {
        matchClockSeconds += dt * 12.0;
        if (half === 1 && matchClockSeconds >= 45 * 60) {
          matchClockSeconds = 45 * 60;
          half = 2;
          playWhistleSfx(false);
          setupKickoff('AWAY');
          showBanner(
            'INÍCIO DO 2º TEMPO!',
            '#C8A45D',
            2.2,
            `${homeClub.shortName} ${homeGoals} : ${awayGoals} ${rivalClub.shortName}`,
          );
        } else if (half === 2 && matchClockSeconds >= 90 * 60) {
          matchClockSeconds = 90 * 60;
          half = 'FT';
          playWhistleSfx(true);
          const ftTitle =
            homeGoals > awayGoals
              ? `VITÓRIA NO CLÁSSICO! (${homeGoals} : ${awayGoals})`
              : homeGoals < awayGoals
                ? `FIM DE JOGO (${homeGoals} : ${awayGoals})`
                : `TUDO IGUAL NO CLÁSSICO (${homeGoals} : ${awayGoals})`;
          showBanner(
            ftTitle,
            homeGoals > awayGoals ? '#2DBE60' : homeGoals < awayGoals ? '#EF4444' : '#C8A45D',
            8.0,
            `SUA ATUAÇÃO: ${userGoals} GOLS • ${userAssists} ASSISTÊNCIAS`,
          );
        }
      }

      // Orientação da Câmera (usada também para movimentação relativa ao ângulo de visão!)
      if (cameraPreset === 'BROADCAST_TV') {
        // Câmera na arquibancada Leste (+X) olhando para Oeste (-X): Direita no analógico = Gol Norte (-Z)!
        camYaw = Math.PI / 2;
      } else {
        manualAimOffsetYaw = Math.max(
          -1.05,
          Math.min(1.05, manualAimOffsetYaw - inp.lookDeltaX * 0.95),
        );
        if (Math.abs(inp.lookDeltaX) < 0.001) {
          manualAimOffsetYaw *= Math.max(0, 1 - 2.0 * dt);
        }
        camPitch = Math.max(0.14, Math.min(0.52, camPitch + inp.lookDeltaY * 0.7));

        const lookFocusX =
          ball.ownerId === 'USER'
            ? pState.pos.x * 0.25
            : ball.pos.x * 0.72 + pState.pos.x * 0.28;
        const lookFocusZ =
          ball.ownerId === 'USER'
            ? -PITCH.HALF_L
            : Math.min(pState.pos.z - 6, ball.pos.z * 0.8 - 6);
        const dxCam = lookFocusX - pState.pos.x;
        const dzCam = lookFocusZ - pState.pos.z;
        const autoYaw = Math.atan2(-dxCam, -dzCam) + manualAimOffsetYaw;
        camYaw += shortestYawDelta(camYaw, autoYaw) * Math.min(1, 6.8 * dt);
      }

      // Snapshots táticos em tempo real dos 20 jogadores de linha
      const userMaxSpd = 7.8 + (activePlayer.attributes.sprintSpeed / 99) * 3.15;
      const homeSnapshots: TacticalParticipantSnapshot[] = [
        {
          id: 'USER',
          isUser: true,
          slot: userSlotSpec,
          pos: pState.pos,
          vel: pState.vel,
          maxSprintSpeed: userMaxSpd,
        },
        ...homeAgents.map((a) => ({
          id: a.id,
          isUser: false,
          slot: a.slot,
          pos: a.pos,
          vel: a.vel,
          maxSprintSpeed: a.maxSprintSpeed,
        })),
      ];
      const awaySnapshots: TacticalParticipantSnapshot[] = awayAgents.map((a) => ({
        id: a.id,
        isUser: false,
        slot: a.slot,
        pos: a.pos,
        vel: a.vel,
        maxSprintSpeed: a.maxSprintSpeed,
      }));

      // Seleciona dinamicamente o MELHOR COMPANHEIRO na direção do analógico do usuário p/ Passe/Enfiada/Cruzamento!
      const fwdX = -Math.sin(camYaw);
      const fwdZ = -Math.cos(camYaw);
      const rightX = Math.cos(camYaw);
      const rightZ = -Math.sin(camYaw);
      const rawWishX = rightX * inp.moveX + fwdX * -inp.moveZ;
      const rawWishZ = rightZ * inp.moveX + fwdZ * -inp.moveZ;
      const rawWishLen = Math.hypot(rawWishX, rawWishZ);
      const aimX = rawWishLen > 0.18 ? rawWishX / rawWishLen : Math.sin(pState.facingYaw);
      const aimZ = rawWishLen > 0.18 ? rawWishZ / rawWishLen : Math.cos(pState.facingYaw);

      const activePassIntent =
        pState.chargeIntent === 'THROUGH'
          ? 'THROUGH'
          : pState.chargeIntent === 'CROSS' || pState.lockedIntent === 'CROSS'
            ? 'CROSS'
            : 'PASS';

      const selectedMate = selectBestTeammateForUserKick(
        pState.pos,
        aimX,
        aimZ,
        rawWishLen > 0.18,
        pState.powerCharge01 > 0 ? pState.powerCharge01 : 0.42,
        activePassIntent,
        homeAgents,
        awaySnapshots,
      );

      if (ball.ownerId === 'USER' && selectedMate) {
        passTargetRing.visible = true;
        passTargetRing.position.set(selectedMate.pos.x, 0.024, selectedMate.pos.z);
      } else {
        passTargetRing.visible = false;
      }

      if (half === 'FT') {
        pState.vel.multiplyScalar(0.9);
        stepBallPhysics(ball, dt);
      } else if (celebrationTimer > 0) {
        celebrationTimer -= dt;
        pState.vel.multiplyScalar(0.92);
        pState.pos.addScaledVector(pState.vel, dt);
        stepBallPhysics(ball, dt);
        if (celebrationTimer <= 0) {
          setupKickoff(ball.enteredGoalSide === 'NORTH' ? 'AWAY' : 'HOME');
          playWhistleSfx(false);
        }
      } else if (outRestartTimer > 0) {
        outRestartTimer -= dt;
        pState.vel.multiplyScalar(0.88);
        if (outRestartTimer <= 0) {
          executeOutOfBoundsRestart(pendingOutPos);
        }
      } else {
        // 4A. Controle do Jogador do Usuário
        const refMatePos = selectedMate ? selectedMate.pos : new THREE.Vector3(0, 0, -25);
        const refMateVel = selectedMate ? selectedMate.vel : new THREE.Vector3(0, 0, 0);

        const userStep = stepPlayerAndBallControl(
          pState,
          activePlayer,
          ball,
          inp,
          camYaw,
          refMatePos,
          refMateVel,
          awayGk.pos,
          dt,
        );

        // Se o usuário tocou a bola (A / Y / X), trava o receptor escolhido no coordenador para ele correr na bola!
        if (
          selectedMate &&
          (userStep.kicked === 'GROUND_PASS' ||
            userStep.kicked === 'THROUGH_BALL' ||
            userStep.kicked === 'LOB_CROSS')
        ) {
          homeCoord.lockedPassReceiverId = selectedMate.id;
          homeCoord.lockedPassTimer = 2.2;
        }

        if (userStep.calledForBall !== null) {
          userQueuedCall = userStep.calledForBall;
          userQueuedCallTimer = 1.9;
        } else if (userQueuedCallTimer > 0) {
          userQueuedCallTimer = Math.max(0, userQueuedCallTimer - dt);
          if (userQueuedCallTimer <= 0 || ball.ownerId === 'USER') {
            userQueuedCall = null;
          }
        }

        // 4B. Coordenadores Coletivos (Mandante & Visitante)
        const opponentHasBall =
          ball.ownerId !== null && ball.ownerId.startsWith('AWAY_');
        const userHoldingTeamPress = opponentHasBall && inp.finesseHeld;

        stepTeamTacticalCoordinator(
          homeCoord,
          ball,
          homeSnapshots,
          awaySnapshots,
          userHoldingTeamPress,
          dt,
        );
        stepTeamTacticalCoordinator(
          awayCoord,
          ball,
          awaySnapshots,
          homeSnapshots,
          false,
          dt,
        );

        // 4C. Execução dos 19 Jogadores de Linha da IA (9 Companheiros + 10 Rivais)
        stepOutfieldAgentsTeam(
          homeAgents,
          homeCoord,
          ball,
          homeSnapshots,
          awaySnapshots,
          awayGk.pos,
          userQueuedCall,
          userStep.commandedMateShoot,
          pState.pos,
          pState.vel,
          userStep.triggeredFakeShotDirX,
          dt,
          timeSec,
        );

        if (ball.lastTouchBy !== null && ball.lastTouchBy !== 'USER' && userQueuedCall !== null) {
          // Se um companheiro já soltou o passe pra você, limpa o pedido!
          if (homeCoord.lockedPassReceiverId === 'USER' && ball.ownerId === null) {
            userQueuedCall = null;
            userQueuedCallTimer = 0;
          }
        }

        stepOutfieldAgentsTeam(
          awayAgents,
          awayCoord,
          ball,
          awaySnapshots,
          homeSnapshots,
          homeGk.pos,
          null,
          false,
          pState.pos,
          pState.vel,
          userStep.triggeredFakeShotDirX,
          dt,
          timeSec,
        );

        // 4D. Os 2 Goleiros IA (com escolha inteligente de companheiro livre p/ reposição!)
        const bestHomeOutlet =
          [...homeSnapshots]
            .filter((s) => s.pos.z > 4 && s.pos.z < PITCH.HALF_L - 10)
            .sort((a, b) => {
              const minOppA = Math.min(
                ...awaySnapshots.map((o) => Math.hypot(o.pos.x - a.pos.x, o.pos.z - a.pos.z)),
              );
              const minOppB = Math.min(
                ...awaySnapshots.map((o) => Math.hypot(o.pos.x - b.pos.x, o.pos.z - b.pos.z)),
              );
              return minOppB - minOppA;
            })[0]?.pos ?? pState.pos;

        const bestAwayOutlet =
          [...awaySnapshots]
            .filter((s) => s.pos.z < -4 && s.pos.z > -PITCH.HALF_L + 10)
            .sort((a, b) => {
              const minOppA = Math.min(
                ...homeSnapshots.map((o) => Math.hypot(o.pos.x - a.pos.x, o.pos.z - a.pos.z)),
              );
              const minOppB = Math.min(
                ...homeSnapshots.map((o) => Math.hypot(o.pos.x - b.pos.x, o.pos.z - b.pos.z)),
              );
              return minOppB - minOppA;
            })[0]?.pos ?? new THREE.Vector3(0, 0, -18);

        const gkSkillAway = Math.max(0.45, Math.min(0.75, (rivalClub.squadAvgOvr - 52) / 42));
        const gkSkillHome = Math.max(0.48, Math.min(0.78, (homeClub.squadAvgOvr - 50) / 42));

        const awaySave = stepGoalkeeperAI(
          awayGk,
          ball,
          bestAwayOutlet,
          userStep.triggeredFakeShotDirX,
          gkSkillAway,
          dt,
          timeSec,
        );
        if (awaySave.madeSave) {
          showBanner(
            awaySave.caughtFirmly ? 'DEFESA FIRME DO GOLEIRO!' : 'ESPALMOU O GOLEIRO RIVAL!',
            '#F59E0B',
            1.2,
          );
        }

        const homeSave = stepGoalkeeperAI(
          homeGk,
          ball,
          bestHomeOutlet,
          null,
          gkSkillHome,
          dt,
          timeSec,
        );
        if (homeSave.madeSave) {
          showBanner(
            homeSave.caughtFirmly ? 'GRANDE DEFESA DO NOSSO GOLEIRO!' : 'SALVOU NOSSO GOLEIRO!',
            '#10B981',
            1.2,
          );
        }

        // 4E. Física 240Hz da Bola, Traves, Gols Norte/Sul e Saídas de Campo
        const ballEvents = stepBallPhysics(ball, dt);

        if (ballEvents.hitPost) {
          playPostClangSfx();
          showBanner('EXPLODIU NA TRAVE!', '#FACC15', 1.3);
        }

        if (ballEvents.scoredNorthGoal) {
          // GOL DO TIME DO USUÁRIO (MANDANTE)!
          playGoalRoarSfx();
          homeGoals += 1;
          const scorerId = ball.lastTouchBy ?? 'USER';
          const scorerLabel = actorNameMap.get(scorerId) ?? homeClub.shortName;
          const assistId =
            penultimateHomeTouchId && penultimateHomeTouchId !== scorerId
              ? penultimateHomeTouchId
              : null;

          if (scorerId === 'USER') userGoals += 1;
          if (assistId === 'USER') userAssists += 1;

          const assistSub = assistId
            ? `ASSISTÊNCIA: ${actorNameMap.get(assistId) ?? ''}`
            : `${homeClub.shortName} ${homeGoals} : ${awayGoals} ${rivalClub.shortName}`;

          showBanner(`GOOOOOL DO ${homeClub.shortName}! • ${scorerLabel}`, '#2DBE60', 2.4, assistSub);
          celebrationTimer = 2.3;
        } else if (ballEvents.scoredSouthGoal) {
          // GOL DO RIVAL (VISITANTE)!
          playWhistleSfx(true);
          awayGoals += 1;
          const scorerId = ball.lastTouchBy ?? '';
          const scorerLabel = actorNameMap.get(scorerId) ?? rivalClub.shortName;
          showBanner(
            `GOL DO ${rivalClub.shortName} • ${scorerLabel}`,
            '#EF4444',
            2.3,
            `${homeClub.shortName} ${homeGoals} : ${awayGoals} ${rivalClub.shortName}`,
          );
          celebrationTimer = 2.2;
        } else if (ballEvents.wentOutOfBounds) {
          playBallKickSfx(0.25);
          pendingOutPos.copy(ball.pos);
          outRestartTimer = 0.68;
        }
      }

      // 5. Atualiza Malhas 3D, Anéis Indicadores e Animação do Jogador do Usuário
      stadium.ballMesh.position.copy(ball.pos);
      stadium.ballMesh.quaternion.copy(ball.quat);

      userRing.position.set(pState.pos.x, 0.03, pState.pos.z);
      userRingMat.color.set(userQueuedCall ? '#38BDF8' : '#FACC15');
      const ringPulse = userQueuedCall ? 1 + Math.sin(timeSec * 14) * 0.18 : 1;
      userRing.scale.setScalar(ringPulse);

      if (ball.ownerId && ball.ownerId !== 'USER') {
        const ownerAgent =
          homeAgents.find((a) => a.id === ball.ownerId) ??
          awayAgents.find((a) => a.id === ball.ownerId);
        const ownerPos = ownerAgent
          ? ownerAgent.pos
          : ball.ownerId === 'HOME_GK'
            ? homeGk.pos
            : awayGk.pos;
        carrierRing.visible = true;
        carrierRing.position.set(ownerPos.x, 0.025, ownerPos.z);
        carrierRingMat.color.set(
          ball.ownerId.startsWith('HOME_') ? '#2DBE60' : '#EF4444',
        );
      } else {
        carrierRing.visible = false;
      }

      userActor.root.position.copy(pState.pos);
      userActor.root.rotation.y = pState.facingYaw;

      const uSpeed = Math.hypot(pState.vel.x, pState.vel.z);
      const fakeShotProgress =
        pState.fakeShotAnimTimer > 0 ? 1 - pState.fakeShotAnimTimer / 0.34 : 0;

      const userPose: PitchPoseState =
        celebrationTimer > 0 && ball.enteredGoalSide === 'NORTH'
          ? 'CELEBRATE'
          : pState.slideTimer > 0
            ? 'SLIDE'
            : pState.fakeShotAnimTimer > 0
              ? 'FAKE_SHOT'
              : pState.kickAnimTimer > 0
                ? 'KICK'
                : pState.chargeIntent !== null || pState.windupTimer > 0
                  ? 'CHARGE'
                  : uSpeed > 0.2
                    ? 'RUN'
                    : 'IDLE';

      const animParam =
        userPose === 'FAKE_SHOT'
          ? fakeShotProgress
          : pState.windupTimer > 0
            ? pState.lockedPower01
            : pState.powerCharge01;

      const finesseChargeLeftFoot =
        ball.pos.x < -0.9
          ? false
          : ball.pos.x > 0.9
            ? true
            : inp.moveX > 0.22
              ? false
              : inp.moveX < -0.22
                ? true
                : activePlayer.preferredFoot === 'ESQUERDA';

      const animUseLeftFoot =
        userPose === 'KICK' || userPose === 'FAKE_SHOT'
          ? pState.lastKickUsedLeftFoot
          : userPose === 'CHARGE' && (pState.chargingFinesse || inp.finesseHeld)
            ? finesseChargeLeftFoot
            : activePlayer.preferredFoot === 'ESQUERDA';

      animatePitchActor(
        userActor,
        userPose,
        uSpeed,
        animParam,
        animUseLeftFoot,
        dt,
        timeSec,
      );

      stadium.updateDynamicElements(
        timeSec,
        ball.netRipple,
        ball.netHitPoint,
        celebrationTimer > 0 && ball.enteredGoalSide === 'NORTH',
        false,
      );

      // 6. Posicionamento Suave das 3 Câmeras Disponíveis
      const targetCamPos = new THREE.Vector3();
      const targetLook = new THREE.Vector3();

      if (cameraPreset === 'BROADCAST_TV') {
        const focusZ = Math.max(-PITCH.HALF_L + 14, Math.min(PITCH.HALF_L - 14, ball.pos.z * 0.78));
        targetCamPos.set(39.5, 22.5, focusZ);
        targetLook.set(ball.pos.x * 0.32, 0.8, focusZ);
      } else if (cameraPreset === 'PRO_TACTICAL') {
        const camForwardX = -Math.sin(camYaw);
        const camForwardZ = -Math.cos(camYaw);
        const camDist = 8.4 + camPitch * 2.6;
        const camHeight = 3.55 + camPitch * 4.6;
        targetCamPos.set(
          pState.pos.x - camForwardX * camDist,
          pState.pos.y + camHeight,
          pState.pos.z - camForwardZ * camDist,
        );
        targetLook.set(
          pState.pos.x + camForwardX * 9.5,
          pState.pos.y + 1.1,
          pState.pos.z + camForwardZ * 9.5,
        );
      } else {
        const camForwardX = -Math.sin(camYaw);
        const camForwardZ = -Math.cos(camYaw);
        const camDist = 5.6 + camPitch * 2.2;
        const camHeight = 1.7 + camPitch * 4.1;
        targetCamPos.set(
          pState.pos.x - camForwardX * camDist,
          pState.pos.y + camHeight,
          pState.pos.z - camForwardZ * camDist,
        );
        targetLook.set(
          pState.pos.x + camForwardX * 6.5,
          pState.pos.y + 1.15,
          pState.pos.z + camForwardZ * 6.5,
        );
      }

      smoothCamPos.lerp(targetCamPos, Math.min(1, 10 * dt));
      smoothCamLook.lerp(targetLook, Math.min(1, 13 * dt));
      camera.position.copy(smoothCamPos);
      camera.lookAt(smoothCamLook);

      renderer.render(scene, camera);

      // 7. Sincroniza Placar, Cronômetro e Radar 2D (25 Hz)
      hudSyncAcc += dt;
      if (hudSyncAcc >= 0.04) {
        hudSyncAcc = 0;
        const radarDots: RadarDotSnapshot[] = [
          {
            id: 'USER',
            x: pState.pos.x,
            z: pState.pos.z,
            team: 'HOME',
            isUser: true,
            hasBall: ball.ownerId === 'USER',
          },
          {
            id: 'HOME_GK',
            x: homeGk.pos.x,
            z: homeGk.pos.z,
            team: 'HOME',
            isGk: true,
            hasBall: ball.ownerId === 'HOME_GK',
          },
          ...homeAgents.map((a) => ({
            id: a.id,
            x: a.pos.x,
            z: a.pos.z,
            team: 'HOME' as const,
            hasBall: ball.ownerId === a.id,
          })),
          {
            id: 'AWAY_GK',
            x: awayGk.pos.x,
            z: awayGk.pos.z,
            team: 'AWAY',
            isGk: true,
            hasBall: ball.ownerId === 'AWAY_GK',
          },
          ...awayAgents.map((a) => ({
            id: a.id,
            x: a.pos.x,
            z: a.pos.z,
            team: 'AWAY' as const,
            hasBall: ball.ownerId === a.id,
          })),
        ];

        const teamPossession: 'HOME' | 'AWAY' | 'NEUTRAL' =
          ball.ownerId === 'USER' || (ball.ownerId && ball.ownerId.startsWith('HOME_'))
            ? 'HOME'
            : ball.ownerId && ball.ownerId.startsWith('AWAY_')
              ? 'AWAY'
              : ball.lastTouchTeam ?? 'NEUTRAL';

        setHud({
          homeGoals,
          awayGoals,
          userGoals,
          userAssists,
          matchMinute: Math.min(90, Math.floor(matchClockSeconds / 60)),
          matchSecond: Math.floor(matchClockSeconds % 60),
          half,
          stamina: pState.stamina,
          maxStamina: pState.maxStamina,
          powerPct: pState.hudPower01 * 100,
          teamPossession,
          userHasBall: ball.ownerId === 'USER',
          cameraPreset,
          homeFormationLabel: homeFormation.id,
          awayFormationLabel: awayFormation.id,
          bannerFeedback: bannerObj,
          ballX: ball.pos.x,
          ballZ: ball.pos.z,
          radarDots,
        });
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      inputCollector.detach();
      stadium.dispose();
      userActor.dispose();
      homeAgents.forEach((a) => a.actor.dispose());
      awayAgents.forEach((a) => a.actor.dispose());
      homeGk.actor.dispose();
      awayGk.actor.dispose();
      ringGeo.dispose();
      userRingMat.dispose();
      carrierRingGeo.dispose();
      carrierRingMat.dispose();
      passTargetRingGeo.dispose();
      passTargetRingMat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === host) {
        host.removeChild(renderer.domElement);
      }
    };
  }, [compTheme, derby, awayFormation, homeFormation, loadedSquads]);

  return (
    <div
      data-modal-scope="true"
      data-pitch-3d-active="true"
      className="fixed inset-0 z-50 w-screen h-screen bg-[#071226] overflow-hidden"
    >
      <div ref={canvasHostRef} className="absolute inset-0 w-full h-full cursor-crosshair" />

      {!loadedSquads && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#071226]">
          <div className="bg-[#0B0B0D] border border-white/15 px-8 py-5 text-center">
            <div className="text-xs uppercase tracking-[0.25em] text-[#C8A45D] font-bold">
              PREPARANDO CLÁSSICO 11v11
            </div>
            <div className="font-condensed uppercase font-extrabold text-3xl text-[#F5F5F7] mt-1">
              {derby.homeClub.name} × {derby.rivalClub.name}
            </div>
          </div>
        </div>
      )}

      <Match11v11HudOverlay
        player={player}
        homeClub={derby.homeClub}
        rivalClub={derby.rivalClub}
        awayRenderClub={derby.awayRenderClub}
        derbyName={derby.derbyName}
        accentColor={compTheme.accentPrimary}
        hud={hud}
        onCycleCamera={() => cycleCameraRef.current?.()}
        onRestartMatch={() => restartMatchRef.current?.()}
        onExit={onExit}
      />
    </div>
  );
};
