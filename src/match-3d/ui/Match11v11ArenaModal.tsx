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
  PitchActorInstance,
  PitchPoseState,
} from '../actors/pitchActorRig';
import {
  createOutfieldAgentsForTeam,
  evaluatePassLaneSafety01,
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
import { BALL_AERO, createInitialBallState, stepBallPhysics } from '../physics/ballPhysics';
import { PITCH } from '../physics/pitchConstants';
import {
  createInitialPlayerPitchState,
  stepPlayerAndBallControl,
} from '../physics/playerLocomotion';
import {
  applyReplayFrameAndCamera,
  GoalReplayRecorder,
  ReplayActorSnapshot,
  ReplayCameraAngle,
  ReplayFrameSnapshot,
} from '../replay/goalReplaySystem';
import { buildStadium3D } from '../stadium/buildStadium3D';
import {
  Match11v11HudOverlay,
  Match11v11HudSnapshot,
  MatchCameraPreset,
  RadarDisplayMode,
  RadarDotSnapshot,
} from './Match11v11HudOverlay';

interface Match11v11ArenaModalProps {
  player: CareerPlayer;
  club: ClubData;
  competitionId?: AnyCompetitionId;
  onExit: () => void;
}

type ActiveSetPiece = {
  kind: 'CORNER' | 'GOAL_KICK' | 'THROW_IN';
  team: 'HOME' | 'AWAY';
  takerId: string;
  spot: THREE.Vector3;
  timer: number;
};

type ActiveReplayPlayback = {
  frames: ReplayFrameSnapshot[];
  shotOrigin: THREE.Vector3;
  goalZ: number;
  cursor: number;
  scorerText: string;
  fromPauseMenu: boolean;
  nextKickoffTeam: 'HOME' | 'AWAY';
};

const CAMERA_CYCLE: MatchCameraPreset[] = ['BROADCAST_TV', 'PRO_TACTICAL', 'PRO_CLOSE'];
const RADAR_CYCLE: RadarDisplayMode[] = ['AUTO_FADE', 'ALWAYS_VISIBLE', 'HIDDEN'];
const REPLAY_ANGLE_CYCLE: ReplayCameraAngle[] = ['BEHIND_WIDE', 'TV_BROADCAST', 'BEHIND_GOAL'];

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
    stoppageMinutes: 2,
    inStoppageTime: false,
    half: 1,
    paused: false,
    pauseTab: 'MAIN',
    pauseMenuIndex: 0,
    isReplayActive: false,
    replayAngle: 'BEHIND_WIDE',
    replayScorerText: '',
    stamina: initialCap,
    maxStamina: initialCap,
    powerPct: 0,
    cameraPreset: 'BROADCAST_TV',
    radarMode: 'AUTO_FADE',
    homeFormationLabel: homeFormation.id,
    awayFormationLabel: awayFormation.id,
    scorebugTicker: null,
    ballX: 0,
    ballZ: 0,
    userX: 0,
    radarDots: [],
    stats: {
      homePossessionPct: 50,
      awayPossessionPct: 50,
      homeShots: 0,
      awayShots: 0,
      homePasses: 0,
      awayPasses: 0,
      homeTackles: 0,
      awayTackles: 0,
      homeSaves: 0,
      awaySaves: 0,
      homeCorners: 0,
      awayCorners: 0,
      userPasses: 0,
      userTackles: 0,
    },
  });

  const controlsRef = useRef<{
    resume: () => void;
    togglePause: () => void;
    openSettingsTab: (tab: 'MAIN' | 'SETTINGS') => void;
    launchInstantReplay: () => void;
    cycleReplayAngle: () => void;
    cycleCamera: () => void;
    cycleRadarMode: () => void;
    skipReplay: () => void;
    restartMatch: () => void;
  }>({
    resume: () => {},
    togglePause: () => {},
    openSettingsTab: () => {},
    launchInstantReplay: () => {},
    cycleReplayAngle: () => {},
    cycleCamera: () => {},
    cycleRadarMode: () => {},
    skipReplay: () => {},
    restartMatch: () => {},
  });

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
    scene.fog = new THREE.FogExp2('#071226', 0.0034);

    const camera = new THREE.PerspectiveCamera(50, 1, 0.2, 340);
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

    const allOrderedActors: PitchActorInstance[] = [
      userActor,
      homeGk.actor,
      awayGk.actor,
      ...homeAgents.map((a) => a.actor),
      ...awayAgents.map((a) => a.actor),
    ];
    const replayRecorder = new GoalReplayRecorder(allOrderedActors.length, 300);
    const liveActorStatesBuffer: ReplayActorSnapshot[] = allOrderedActors.map(() => ({
      x: 0,
      z: 0,
      yaw: 0,
      pose: 'IDLE',
      speed: 0,
      animParam: 0,
      useLeftFoot: false,
    }));

    const ringGeo = new THREE.RingGeometry(0.54, 0.72, 36);
    const userRingMat = new THREE.MeshBasicMaterial({
      color: '#FACC15',
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.92,
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
    let matchClockSeconds = 0;
    let half: 1 | 2 | 'HT' | 'FT' = 1;
    let stoppageMinutes = 1 + Math.floor(Math.random() * 3);
    let halfTimeBreakTimer = 0;
    let fullTimeCoastTimer = 0;

    // Estatísticas Ao Vivo estilo FIFA
    let homePossTime = 1.0;
    let awayPossTime = 1.0;
    let homeShots = 0;
    let awayShots = 0;
    let homePasses = 0;
    let awayPasses = 0;
    let homeTackles = 0;
    let awayTackles = 0;
    let homeSaves = 0;
    let awaySaves = 0;
    let homeCorners = 0;
    let awayCorners = 0;
    let userPasses = 0;
    let userTackles = 0;

    let paused = false;
    let pauseTab: 'MAIN' | 'SETTINGS' = 'MAIN';
    let pauseMenuIndex = 0;

    let cameraPreset: MatchCameraPreset = 'BROADCAST_TV';
    let radarMode: RadarDisplayMode = 'AUTO_FADE';
    let replayAngle: ReplayCameraAngle = 'BEHIND_WIDE';
    let camYaw = Math.PI / 2;
    let camPitch = 0.28;
    let manualAimOffsetYaw = 0;
    const smoothCamPos = new THREE.Vector3(41.5, 23.0, 0);
    const smoothCamLook = new THREE.Vector3(0, 0.7, 0);

    let celebrationTimer = 0;
    let pendingGoalScorerBanner = '';
    let pendingKickoffTeam: 'HOME' | 'AWAY' = 'AWAY';
    let activeReplay: ActiveReplayPlayback | null = null;
    let activeSetPiece: ActiveSetPiece | null = null;

    let tickerTimer = 0;
    let tickerObj: { text: string; color: string } | null = null;

    let userQueuedCall: 'PASS' | 'THROUGH' | 'CROSS' | null = null;
    let userQueuedCallTimer = 0;
    let lastHomePasserId: string | null = null;
    let penultimateHomeTouchId: string | null = null;
    let prevBallLastTouch: string | null = null;
    let prevBallOwnerTeam: 'HOME' | 'AWAY' | null = 'HOME';

    const showTicker = (text: string, color: string, dur = 1.6) => {
      tickerObj = { text, color };
      tickerTimer = dur;
    };

    const restoreLiveActorTransforms = () => {
      userActor.root.position.copy(pState.pos);
      userActor.root.rotation.y = pState.facingYaw;
      homeGk.actor.root.position.copy(homeGk.pos);
      awayGk.actor.root.position.copy(awayGk.pos);
      homeAgents.forEach((a) => {
        a.actor.root.position.copy(a.pos);
        a.actor.root.rotation.y = a.facingYaw;
      });
      awayAgents.forEach((a) => {
        a.actor.root.position.copy(a.pos);
        a.actor.root.rotation.y = a.facingYaw;
      });
      stadium.ballMesh.position.copy(ball.pos);
      stadium.ballMesh.quaternion.copy(ball.quat);
    };

    const setupKickoff = (kickingTeam: 'HOME' | 'AWAY') => {
      activeSetPiece = null;
      activeReplay = null;
      replayRecorder.clear();

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
        ag.engageTimer = 0;
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
        ag.engageTimer = 0;
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
    };

    const prepareSetPieceFromOut = (exitPos: THREE.Vector3) => {
      const receivingTeam: 'HOME' | 'AWAY' = ball.lastTouchTeam === 'HOME' ? 'AWAY' : 'HOME';
      ball.enteredGoalSide = null;
      ball.vel.set(0, 0, 0);
      ball.spin.set(0, 0, 0);
      ball.ownerId = 'SET_PIECE_HOLD';
      ball.touchCooldown = 0.3;
      playWhistleSfx(false);

      if (exitPos.z < -PITCH.HALF_L + 0.3) {
        if (ball.lastTouchTeam === 'HOME') {
          const sideSign = exitPos.x >= 0 ? 1 : -1;
          const spot = new THREE.Vector3(sideSign * 5.2, PITCH.BALL_RADIUS, -PITCH.HALF_L + 5.4);
          ball.pos.copy(spot);
          awayGk.pos.set(spot.x, 0, spot.z - 1.3);
          awayGk.vel.set(0, 0, 0);

          if (pState.pos.z < -PITCH.HALF_L + 19.5) {
            pState.pos.z = -PITCH.HALF_L + 20.5;
            pState.vel.set(0, 0, 0);
          }
          homeAgents.forEach((a) => {
            if (a.pos.z < -PITCH.HALF_L + 19.5) {
              a.pos.z = -PITCH.HALF_L + 21.0;
              a.vel.set(0, 0, 0);
            }
          });
          awayAgents.forEach((a, idx) => {
            if (a.slot.line === 'DEF') {
              a.pos.set((idx - 1.5) * 14.5, 0, -PITCH.HALF_L + 13.5);
              a.vel.set(0, 0, 0);
            }
          });

          activeSetPiece = { kind: 'GOAL_KICK', team: 'AWAY', takerId: 'AWAY_GK', spot, timer: 0.9 };
          showTicker(`TIRO DE META • ${rivalClub.shortName}`, '#9498A3', 1.2);
          return;
        } else {
          homeCorners += 1;
          const cornerX = exitPos.x >= 0 ? PITCH.HALF_W - 0.55 : -PITCH.HALF_W + 0.55;
          const cornerZ = -PITCH.HALF_L + 0.55;
          const spot = new THREE.Vector3(cornerX, PITCH.BALL_RADIUS, cornerZ);
          ball.pos.copy(spot);

          const taker =
            [...homeAgents]
              .filter((a) => a.slot.roleLabel !== 'ZAG' && a.slot.roleLabel !== 'ATA')
              .sort(
                (a, b) =>
                  Math.hypot(a.pos.x - cornerX, a.pos.z - cornerZ) -
                  Math.hypot(b.pos.x - cornerX, b.pos.z - cornerZ),
              )[0] ?? homeAgents[0];

          taker.pos.set(cornerX + Math.sign(cornerX) * 0.95, 0, cornerZ - 0.55);
          taker.vel.set(0, 0, 0);
          taker.facingYaw = Math.atan2(0 - taker.pos.x, -PITCH.HALF_L + 10.5 - taker.pos.z);

          pState.pos.set(-Math.sign(cornerX) * 1.8, 0, -PITCH.HALF_L + 11.2);
          pState.vel.set(0, 0, 0);
          pState.facingYaw = Math.atan2(cornerX - pState.pos.x, cornerZ - pState.pos.z);

          const boxSpots: [number, number][] = [
            [Math.sign(cornerX) * 4.2, -PITCH.HALF_L + 7.5],
            [0.5, -PITCH.HALF_L + 9.2],
            [-Math.sign(cornerX) * 4.8, -PITCH.HALF_L + 10.2],
            [Math.sign(cornerX) * 6.5, -PITCH.HALF_L + 15.5],
            [-3.5, -PITCH.HALF_L + 18.5],
          ];
          let bIdx = 0;
          for (const ag of homeAgents) {
            if (ag.id === taker.id) continue;
            if (bIdx < boxSpots.length) {
              ag.pos.set(boxSpots[bIdx][0], 0, boxSpots[bIdx][1]);
              ag.vel.set(0, 0, 0);
              bIdx += 1;
            } else {
              ag.pos.set(ag.slot.defRelX * 22, 0, -8);
              ag.vel.set(0, 0, 0);
            }
          }

          awayAgents.forEach((ag, idx) => {
            if (idx < 6) {
              ag.pos.set((idx - 2.5) * 3.1, 0, -PITCH.HALF_L + 7.2 + (idx % 2) * 2.6);
              ag.vel.set(0, 0, 0);
            } else {
              ag.pos.set((idx - 7.5) * 8, 0, -PITCH.HALF_L + 19.5);
              ag.vel.set(0, 0, 0);
            }
          });
          awayGk.pos.set(Math.sign(cornerX) * 0.6, 0, -PITCH.HALF_L + 0.9);

          activeSetPiece = { kind: 'CORNER', team: 'HOME', takerId: taker.id, spot, timer: 1.1 };
          showTicker(`ESCANTEIO • ${homeClub.shortName}`, compTheme.accentPrimary, 1.3);
          return;
        }
      }

      if (exitPos.z > PITCH.HALF_L - 0.3) {
        if (ball.lastTouchTeam === 'AWAY') {
          const sideSign = exitPos.x >= 0 ? 1 : -1;
          const spot = new THREE.Vector3(sideSign * 5.2, PITCH.BALL_RADIUS, PITCH.HALF_L - 5.4);
          ball.pos.copy(spot);
          homeGk.pos.set(spot.x, 0, spot.z + 1.3);
          homeGk.vel.set(0, 0, 0);

          awayAgents.forEach((a) => {
            if (a.pos.z > PITCH.HALF_L - 19.5) {
              a.pos.z = PITCH.HALF_L - 21.0;
              a.vel.set(0, 0, 0);
            }
          });
          homeAgents.forEach((a, idx) => {
            if (a.slot.line === 'DEF') {
              a.pos.set((idx - 1.5) * 14.5, 0, PITCH.HALF_L - 13.5);
              a.vel.set(0, 0, 0);
            }
          });

          activeSetPiece = { kind: 'GOAL_KICK', team: 'HOME', takerId: 'HOME_GK', spot, timer: 0.9 };
          showTicker(`TIRO DE META • ${homeClub.shortName}`, '#2DBE60', 1.2);
          return;
        } else {
          awayCorners += 1;
          const cornerX = exitPos.x >= 0 ? PITCH.HALF_W - 0.55 : -PITCH.HALF_W + 0.55;
          const cornerZ = PITCH.HALF_L - 0.55;
          const spot = new THREE.Vector3(cornerX, PITCH.BALL_RADIUS, cornerZ);
          ball.pos.copy(spot);

          const taker =
            [...awayAgents]
              .filter((a) => a.slot.roleLabel !== 'ZAG' && a.slot.roleLabel !== 'ATA')
              .sort(
                (a, b) =>
                  Math.hypot(a.pos.x - cornerX, a.pos.z - cornerZ) -
                  Math.hypot(b.pos.x - cornerX, b.pos.z - cornerZ),
              )[0] ?? awayAgents[0];

          taker.pos.set(cornerX + Math.sign(cornerX) * 0.95, 0, cornerZ + 0.55);
          taker.vel.set(0, 0, 0);
          taker.facingYaw = Math.atan2(0 - taker.pos.x, PITCH.HALF_L - 10.5 - taker.pos.z);

          const boxSpots: [number, number][] = [
            [Math.sign(cornerX) * 4.2, PITCH.HALF_L - 7.5],
            [0.0, PITCH.HALF_L - 9.4],
            [-Math.sign(cornerX) * 4.8, PITCH.HALF_L - 10.4],
            [Math.sign(cornerX) * 5.8, PITCH.HALF_L - 14.5],
            [-3.5, PITCH.HALF_L - 17.5],
          ];
          let bIdx = 0;
          for (const ag of awayAgents) {
            if (ag.id === taker.id) continue;
            if (bIdx < boxSpots.length) {
              ag.pos.set(boxSpots[bIdx][0], 0, boxSpots[bIdx][1]);
              ag.vel.set(0, 0, 0);
              bIdx += 1;
            } else {
              ag.pos.set(ag.slot.defRelX * 22, 0, 8);
              ag.vel.set(0, 0, 0);
            }
          }

          homeAgents.forEach((ag, idx) => {
            if (idx < 6) {
              ag.pos.set((idx - 2.5) * 3.1, 0, PITCH.HALF_L - 7.2 - (idx % 2) * 2.6);
              ag.vel.set(0, 0, 0);
            }
          });
          homeGk.pos.set(Math.sign(cornerX) * 0.6, 0, PITCH.HALF_L - 0.9);

          activeSetPiece = { kind: 'CORNER', team: 'AWAY', takerId: taker.id, spot, timer: 1.1 };
          showTicker(`ESCANTEIO • ${rivalClub.shortName}`, '#EF4444', 1.3);
          return;
        }
      }

      const sideX = exitPos.x >= 0 ? PITCH.HALF_W - 0.25 : -PITCH.HALF_W + 0.25;
      const clampedZ = Math.max(-PITCH.HALF_L + 6, Math.min(PITCH.HALF_L - 6, exitPos.z));
      const spot = new THREE.Vector3(sideX, 1.55, clampedZ);
      ball.pos.copy(spot);

      const pool = receivingTeam === 'HOME' ? homeAgents : awayAgents;
      const oppPool = receivingTeam === 'HOME' ? awayAgents : homeAgents;
      const thrower = [...pool].sort(
        (a, b) =>
          Math.hypot(a.pos.x - sideX, a.pos.z - clampedZ) -
          Math.hypot(b.pos.x - sideX, b.pos.z - clampedZ),
      )[0];

      thrower.pos.set(sideX + Math.sign(sideX) * 0.55, 0, clampedZ);
      thrower.vel.set(0, 0, 0);
      thrower.facingYaw = Math.atan2(-Math.sign(sideX), 0);

      oppPool.forEach((o) => {
        const d = Math.hypot(o.pos.x - sideX, o.pos.z - clampedZ);
        if (d < 5.0) {
          o.pos.x -= Math.sign(sideX) * (5.2 - d);
          o.vel.set(0, 0, 0);
        }
      });

      activeSetPiece = { kind: 'THROW_IN', team: receivingTeam, takerId: thrower.id, spot, timer: 0.68 };
      showTicker(
        `LATERAL • ${receivingTeam === 'HOME' ? homeClub.shortName : rivalClub.shortName}`,
        '#9498A3',
        1.0,
      );
    };

    const executeSetPieceDelivery = (
      sp: ActiveSetPiece,
      homeSnapshots: TacticalParticipantSnapshot[],
      awaySnapshots: TacticalParticipantSnapshot[],
    ) => {
      ball.ownerId = null;
      ball.lastTouchBy = sp.takerId;
      ball.lastTouchTeam = sp.team;
      ball.touchCooldown = 0.32;

      if (sp.kind === 'CORNER') {
        const goalZ = sp.team === 'HOME' ? -PITCH.HALF_L : PITCH.HALF_L;
        const atkDir = sp.team === 'HOME' ? -1 : 1;
        const taker =
          (sp.team === 'HOME' ? homeAgents : awayAgents).find((a) => a.id === sp.takerId) ??
          homeAgents[0];

        const distToUser = Math.hypot(pState.pos.x - sp.spot.x, pState.pos.z - sp.spot.z);
        if (sp.team === 'HOME' && userQueuedCall === 'PASS' && distToUser < 19.0) {
          const dx = pState.pos.x - sp.spot.x;
          const dz = pState.pos.z - sp.spot.z;
          const d = Math.max(1, Math.hypot(dx, dz));
          ball.pos.set(sp.spot.x - Math.sign(sp.spot.x) * 0.4, PITCH.BALL_RADIUS, sp.spot.z + 0.4);
          ball.vel.set((dx / d) * 22.0, 0, (dz / d) * 22.0);
          ball.spin.set(0, 0, 0);
          homeCoord.lockedPassReceiverId = 'USER';
          homeCoord.lockedPassTimer = 2.0;
          userQueuedCall = null;
        } else {
          const targetX =
            sp.team === 'HOME' && Math.abs(pState.pos.x) < 11 && pState.pos.z < -PITCH.HALF_L + 17
              ? pState.pos.x
              : (Math.random() - 0.5) * 5.0;
          const targetZ =
            sp.team === 'HOME' && Math.abs(pState.pos.x) < 11 && pState.pos.z < -PITCH.HALF_L + 17
              ? pState.pos.z
              : goalZ - atkDir * (8.2 + Math.random() * 3.2);

          const dx = targetX - sp.spot.x;
          const dz = targetZ - sp.spot.z;
          const dist = Math.max(8, Math.hypot(dx, dz));
          const horizSpd = Math.min(23.5, Math.max(16.5, dist * 0.72));
          const tFlight = dist / horizSpd;
          const vy0 = 0.5 * Math.abs(BALL_AERO.GRAVITY) * tFlight * 0.92;
          const curveSpinY = sp.spot.x > 0 ? 7.5 * -atkDir : -7.5 * -atkDir;

          ball.pos.set(
            sp.spot.x - Math.sign(sp.spot.x) * 0.35,
            PITCH.BALL_RADIUS + 0.05,
            sp.spot.z - atkDir * 0.35,
          );
          ball.vel.set((dx / dist) * horizSpd, Math.min(11.8, Math.max(7.8, vy0)), (dz / dist) * horizSpd);
          ball.spin.set(-3.5, curveSpinY, 0);

          if (sp.team === 'HOME') {
            homeCoord.lockedPassReceiverId = 'USER';
            homeCoord.lockedPassTimer = 2.2;
          }
        }
        taker.kickAnimTimer = 0.32;
        playBallKickSfx(0.72);
      } else if (sp.kind === 'GOAL_KICK') {
        const mates = sp.team === 'HOME' ? homeSnapshots : awaySnapshots;
        const opps = sp.team === 'HOME' ? awaySnapshots : homeSnapshots;
        const atkDir = sp.team === 'HOME' ? -1 : 1;

        let safeShort: TacticalParticipantSnapshot | null = null;
        for (const m of mates) {
          const d = Math.hypot(m.pos.x - sp.spot.x, m.pos.z - sp.spot.z);
          if (d < 8 || d > 28) continue;
          const safe = evaluatePassLaneSafety01(sp.spot.x, sp.spot.z, m.pos.x, m.pos.z, 24, opps);
          if (safe >= 0.78) {
            safeShort = m;
            break;
          }
        }

        if (safeShort) {
          const dx = safeShort.pos.x - sp.spot.x;
          const dz = safeShort.pos.z - sp.spot.z;
          const d = Math.max(1, Math.hypot(dx, dz));
          ball.pos.y = PITCH.BALL_RADIUS;
          ball.vel.set((dx / d) * 24.0, 0, (dz / d) * 24.0);
          ball.spin.set(0, 0, 0);
          const coord = sp.team === 'HOME' ? homeCoord : awayCoord;
          coord.lockedPassReceiverId = safeShort.id;
          coord.lockedPassTimer = 2.0;
        } else {
          const targetX = (Math.random() - 0.5) * 18;
          const targetZ = sp.spot.z + atkDir * 44;
          const dx = targetX - sp.spot.x;
          const dz = targetZ - sp.spot.z;
          const d = Math.max(10, Math.hypot(dx, dz));
          ball.vel.set((dx / d) * 23.5, 10.6, (dz / d) * 23.5);
          ball.spin.set(-3.0, 0, 0);
        }
        playBallKickSfx(0.76);
      } else {
        const mates = sp.team === 'HOME' ? homeSnapshots : awaySnapshots;
        const opps = sp.team === 'HOME' ? awaySnapshots : homeSnapshots;
        const thrower =
          (sp.team === 'HOME' ? homeAgents : awayAgents).find((a) => a.id === sp.takerId) ??
          homeAgents[0];

        let target: TacticalParticipantSnapshot | null = null;
        let bestScore = -999;
        for (const m of mates) {
          if (m.id === sp.takerId) continue;
          const d = Math.hypot(m.pos.x - sp.spot.x, m.pos.z - sp.spot.z);
          if (d < 3.5 || d > 28) continue;
          const safe = evaluatePassLaneSafety01(sp.spot.x, sp.spot.z, m.pos.x, m.pos.z, 21, opps);
          const score = safe * 10 - d * 0.15 + (m.isUser ? 3.2 : 0);
          if (score > bestScore) {
            bestScore = score;
            target = m;
          }
        }

        const tx = target ? target.pos.x : 0;
        const tz = target ? target.pos.z : sp.spot.z;
        const dx = tx - sp.spot.x;
        const dz = tz - sp.spot.z;
        const dist = Math.max(2, Math.hypot(dx, dz));
        ball.pos.set(sp.spot.x - Math.sign(sp.spot.x) * 0.5, PITCH.BALL_RADIUS, sp.spot.z);
        ball.vel.set((dx / dist) * (18.5 + dist * 0.35), 0, (dz / dist) * (18.5 + dist * 0.35));
        ball.spin.set(0, 0, 0);
        if (target) {
          const coord = sp.team === 'HOME' ? homeCoord : awayCoord;
          coord.lockedPassReceiverId = target.id;
          coord.lockedPassTimer = 2.0;
        }
        thrower.kickAnimTimer = 0.25;
        playBallKickSfx(0.38);
      }

      activeSetPiece = null;
    };

    setupKickoff('HOME');

    controlsRef.current = {
      resume: () => {
        paused = false;
        pauseTab = 'MAIN';
      },
      togglePause: () => {
        if (half !== 'FT') {
          paused = !paused;
          pauseTab = 'MAIN';
          pauseMenuIndex = 0;
        }
      },
      openSettingsTab: (tab) => {
        pauseTab = tab;
        pauseMenuIndex = 0;
      },
      launchInstantReplay: () => {
        const clip = replayRecorder.extractClip(false);
        if (clip.frames.length > 10) {
          activeReplay = {
            frames: clip.frames,
            shotOrigin: clip.shotOrigin,
            goalZ: clip.goalZ,
            cursor: 0,
            scorerText: 'REPLAY INSTANTÂNEO DA PARTIDA',
            fromPauseMenu: true,
            nextKickoffTeam: 'HOME',
          };
        }
      },
      cycleReplayAngle: () => {
        const idx = (REPLAY_ANGLE_CYCLE.indexOf(replayAngle) + 1) % REPLAY_ANGLE_CYCLE.length;
        replayAngle = REPLAY_ANGLE_CYCLE[idx];
      },
      cycleCamera: () => {
        const nextIdx = (CAMERA_CYCLE.indexOf(cameraPreset) + 1) % CAMERA_CYCLE.length;
        cameraPreset = CAMERA_CYCLE[nextIdx];
      },
      cycleRadarMode: () => {
        const nextIdx = (RADAR_CYCLE.indexOf(radarMode) + 1) % RADAR_CYCLE.length;
        radarMode = RADAR_CYCLE[nextIdx];
      },
      skipReplay: () => {
        if (!activeReplay) return;
        const wasFromPause = activeReplay.fromPauseMenu;
        const nextTeam = activeReplay.nextKickoffTeam;
        activeReplay = null;
        if (wasFromPause) {
          restoreLiveActorTransforms();
        } else {
          setupKickoff(nextTeam);
          playWhistleSfx(false);
        }
      },
      restartMatch: () => {
        paused = false;
        pauseTab = 'MAIN';
        pauseMenuIndex = 0;
        homeGoals = 0;
        awayGoals = 0;
        userGoals = 0;
        userAssists = 0;
        homePossTime = 1;
        awayPossTime = 1;
        homeShots = 0;
        awayShots = 0;
        homePasses = 0;
        awayPasses = 0;
        homeTackles = 0;
        awayTackles = 0;
        homeSaves = 0;
        awaySaves = 0;
        homeCorners = 0;
        awayCorners = 0;
        userPasses = 0;
        userTackles = 0;
        matchClockSeconds = 0;
        half = 1;
        fullTimeCoastTimer = 0;
        stoppageMinutes = 1 + Math.floor(Math.random() * 3);
        pState.stamina = pState.maxStamina;
        playWhistleSfx(false);
        setupKickoff('HOME');
      },
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

      // 1. MODO REPLAY (Y troca ângulo; A/B/Espaço pula!)
      if (activeReplay) {
        if (inp.throughJustPressed || inp.resetBallJustPressed) {
          controlsRef.current.cycleReplayAngle();
        }
        if (inp.passJustPressed || inp.shootJustPressed || inp.exitOrFinishJustPressed) {
          controlsRef.current.skipReplay();
        } else {
          userRing.visible = false;
          carrierRing.visible = false;
          passTargetRing.visible = false;

          activeReplay.cursor += dt * 50.0;
          const idx = Math.min(
            activeReplay.frames.length - 1,
            Math.floor(activeReplay.cursor),
          );
          const frame = activeReplay.frames[idx];
          const prog01 = idx / Math.max(1, activeReplay.frames.length - 1);

          applyReplayFrameAndCamera(
            frame,
            prog01,
            activeReplay.shotOrigin,
            activeReplay.goalZ,
            replayAngle,
            allOrderedActors,
            stadium.ballMesh,
            camera,
            dt,
            timeSec,
          );
          stadium.updateDynamicElements(
            timeSec,
            frame.netRipple,
            frame.netHitPoint,
            !activeReplay.fromPauseMenu && prog01 > 0.72,
            false,
          );

          if (activeReplay.cursor >= activeReplay.frames.length + 14) {
            controlsRef.current.skipReplay();
          }
        }

        renderer.render(scene, camera);
        hudSyncAcc += dt;
        if (hudSyncAcc >= 0.05) {
          hudSyncAcc = 0;
          setHud((prev) => ({
            ...prev,
            isReplayActive: Boolean(activeReplay),
            replayAngle,
            replayScorerText: activeReplay?.scorerText ?? '',
          }));
        }
        rafId = requestAnimationFrame(tick);
        return;
      }

      userRing.visible = true;

      // 2. MENU TELA CHEIA ESTILO FIFA (Start/Esc abre, D-Pad navega, A confirma, B volta!)
      if (inp.exitOrFinishJustPressed) {
        if (half === 'FT') {
          callbacksRef.current.onExit();
          return;
        }
        paused = !paused;
        pauseTab = 'MAIN';
        pauseMenuIndex = 0;
      }

      if (paused || half === 'FT') {
        const optionCount =
          pauseTab === 'SETTINGS' ? 3 : half === 'FT' ? 4 : 5;

        if (inp.menuUpJustPressed) {
          pauseMenuIndex = (pauseMenuIndex - 1 + optionCount) % optionCount;
        } else if (inp.menuDownJustPressed) {
          pauseMenuIndex = (pauseMenuIndex + 1) % optionCount;
        } else if (inp.passJustPressed) {
          if (pauseTab === 'SETTINGS') {
            if (pauseMenuIndex === 0) controlsRef.current.cycleCamera();
            else if (pauseMenuIndex === 1) controlsRef.current.cycleRadarMode();
            else controlsRef.current.openSettingsTab('MAIN');
          } else if (half === 'FT') {
            if (pauseMenuIndex === 0) controlsRef.current.restartMatch();
            else if (pauseMenuIndex === 1) controlsRef.current.launchInstantReplay();
            else if (pauseMenuIndex === 2) controlsRef.current.openSettingsTab('SETTINGS');
            else {
              callbacksRef.current.onExit();
              return;
            }
          } else {
            if (pauseMenuIndex === 0) paused = false;
            else if (pauseMenuIndex === 1) controlsRef.current.launchInstantReplay();
            else if (pauseMenuIndex === 2) controlsRef.current.openSettingsTab('SETTINGS');
            else if (pauseMenuIndex === 3) controlsRef.current.restartMatch();
            else {
              callbacksRef.current.onExit();
              return;
            }
          }
        } else if (inp.shootJustPressed) {
          if (pauseTab === 'SETTINGS') {
            controlsRef.current.openSettingsTab('MAIN');
          } else if (paused && half !== 'FT') {
            paused = false;
          }
        }

        renderer.render(scene, camera);
        hudSyncAcc += dt;
        if (hudSyncAcc >= 0.04) {
          hudSyncAcc = 0;
          const totalPoss = Math.max(1, homePossTime + awayPossTime);
          const homePct = Math.round((homePossTime / totalPoss) * 100);
          setHud((prev) => ({
            ...prev,
            half,
            paused,
            pauseTab,
            pauseMenuIndex,
            cameraPreset,
            radarMode,
            isReplayActive: false,
            stats: {
              homePossessionPct: homePct,
              awayPossessionPct: 100 - homePct,
              homeShots,
              awayShots,
              homePasses,
              awayPasses,
              homeTackles,
              awayTackles,
              homeSaves,
              awaySaves,
              homeCorners,
              awayCorners,
              userPasses,
              userTackles,
            },
          }));
        }
        rafId = requestAnimationFrame(tick);
        return;
      }

      if (inp.resetBallJustPressed) {
        controlsRef.current.cycleCamera();
      }

      if (tickerTimer > 0) {
        tickerTimer -= dt;
        if (tickerTimer <= 0) tickerObj = null;
      }

      // Contabiliza Posse de Bola e Desarmes ao Vivo!
      const currOwnerTeam: 'HOME' | 'AWAY' | null =
        ball.ownerId === 'USER' || (ball.ownerId && ball.ownerId.startsWith('HOME_'))
          ? 'HOME'
          : ball.ownerId && ball.ownerId.startsWith('AWAY_')
            ? 'AWAY'
            : null;

      if (currOwnerTeam === 'HOME') homePossTime += dt;
      else if (currOwnerTeam === 'AWAY') awayPossTime += dt;

      if (currOwnerTeam && prevBallOwnerTeam && currOwnerTeam !== prevBallOwnerTeam) {
        if (currOwnerTeam === 'HOME' && ball.ownerId !== 'HOME_GK') {
          homeTackles += 1;
          if (ball.ownerId === 'USER') userTackles += 1;
        } else if (currOwnerTeam === 'AWAY' && ball.ownerId !== 'AWAY_GK') {
          awayTackles += 1;
        }
      }
      if (currOwnerTeam) prevBallOwnerTeam = currOwnerTeam;

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

      // 3. CRONÔMETRO + ACRÉSCIMOS NATURAIS (Só apita quando a bola está calma na faixa central ou parada!)
      if (fullTimeCoastTimer > 0) {
        fullTimeCoastTimer -= dt;
        pState.vel.multiplyScalar(0.9);
        stepBallPhysics(ball, dt);
        if (fullTimeCoastTimer <= 0) {
          half = 'FT';
          pauseTab = 'MAIN';
          pauseMenuIndex = 0;
        }
      } else if (half === 'HT') {
        halfTimeBreakTimer -= dt;
        pState.vel.multiplyScalar(0.9);
        if (halfTimeBreakTimer <= 0) {
          half = 2;
          matchClockSeconds = 45 * 60;
          stoppageMinutes = 2 + Math.floor(Math.random() * 3);
          pState.stamina = Math.min(pState.maxStamina, pState.stamina + 20);
          playWhistleSfx(false);
          setupKickoff('AWAY');
          showTicker('2º TEMPO EM ANDAMENTO', '#C8A45D', 1.5);
        }
      } else if ((half === 1 || half === 2) && celebrationTimer <= 0) {
        matchClockSeconds += dt * 12.0;
        const regLimitSec = (half === 1 ? 45 : 90) * 60;
        const targetEndSec = regLimitSec + stoppageMinutes * 60;
        const hardMaxSec = targetEndSec + 4.0 * 60;

        if (matchClockSeconds >= targetEndSec) {
          const inCalmMidfield =
            Math.abs(ball.pos.z) < 17.5 && Math.hypot(ball.vel.x, ball.vel.z) < 12.0;
          const deadBallSafe =
            activeSetPiece?.kind === 'GOAL_KICK' || activeSetPiece?.kind === 'THROW_IN';

          if (inCalmMidfield || deadBallSafe || matchClockSeconds >= hardMaxSec) {
            activeSetPiece = null;
            playWhistleSfx(true);
            if (half === 1) {
              half = 'HT';
              halfTimeBreakTimer = 1.6;
              showTicker('FIM DO 1º TEMPO', '#C8A45D', 1.6);
            } else {
              fullTimeCoastTimer = 1.3;
              showTicker('APITO FINAL!', '#C8A45D', 1.3);
            }
          }
        }
      }

      if (cameraPreset === 'BROADCAST_TV') {
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

      const userMaxSpd = 8.75 + (activePlayer.attributes.sprintSpeed / 99) * 2.55;
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
        pState.powerCharge01 > 0 ? pState.powerCharge01 : 0.45,
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

      if (celebrationTimer > 0) {
        celebrationTimer -= dt;
        pState.vel.multiplyScalar(0.92);
        pState.pos.addScaledVector(pState.vel, dt);
        stepBallPhysics(ball, dt);
        if (celebrationTimer <= 0) {
          const clip = replayRecorder.extractClip(true);
          if (clip.frames.length > 24) {
            replayAngle = 'BEHIND_WIDE';
            activeReplay = {
              frames: clip.frames,
              shotOrigin: clip.shotOrigin,
              goalZ: clip.goalZ,
              cursor: 0,
              scorerText: pendingGoalScorerBanner,
              fromPauseMenu: false,
              nextKickoffTeam: pendingKickoffTeam,
            };
          } else {
            setupKickoff(pendingKickoffTeam);
            playWhistleSfx(false);
          }
        }
      } else if (activeSetPiece) {
        stepPlayerAndBallControl(
          pState,
          activePlayer,
          ball,
          inp,
          camYaw,
          selectedMate ? selectedMate.pos : new THREE.Vector3(0, 0, -25),
          selectedMate ? selectedMate.vel : new THREE.Vector3(),
          awayGk.pos,
          dt,
        );
        if (inp.passJustPressed) {
          userQueuedCall = 'PASS';
          if (activeSetPiece.team === 'HOME') activeSetPiece.timer = Math.min(activeSetPiece.timer, 0.05);
        } else if (inp.lobOrSlideJustPressed && activeSetPiece.team === 'HOME') {
          activeSetPiece.timer = Math.min(activeSetPiece.timer, 0.05);
        }

        homeAgents.forEach((a) => {
          a.actor.root.position.copy(a.pos);
          a.actor.root.rotation.y = a.facingYaw;
          animatePitchActor(
            a.actor,
            a.id === activeSetPiece?.takerId ? 'CHARGE' : 'IDLE',
            0,
            0.6,
            false,
            dt,
            timeSec,
          );
        });
        awayAgents.forEach((a) => {
          a.actor.root.position.copy(a.pos);
          a.actor.root.rotation.y = a.facingYaw;
          animatePitchActor(
            a.actor,
            a.id === activeSetPiece?.takerId ? 'CHARGE' : 'IDLE',
            0,
            0.6,
            false,
            dt,
            timeSec,
          );
        });
        homeGk.actor.root.position.copy(homeGk.pos);
        awayGk.actor.root.position.copy(awayGk.pos);

        activeSetPiece.timer -= dt;
        if (activeSetPiece.timer <= 0) {
          executeSetPieceDelivery(activeSetPiece, homeSnapshots, awaySnapshots);
        }
      } else if ((half === 1 || half === 2) && fullTimeCoastTimer <= 0) {
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

        if (userStep.kicked === 'POWER_SHOT' || userStep.kicked === 'FINESSE_SHOT' || userStep.kicked === 'CHIP_SHOT') {
          homeShots += 1;
        } else if (userStep.kicked === 'GROUND_PASS' || userStep.kicked === 'THROUGH_BALL' || userStep.kicked === 'LOB_CROSS') {
          homePasses += 1;
          userPasses += 1;
          if (selectedMate) {
            homeCoord.lockedPassReceiverId = selectedMate.id;
            homeCoord.lockedPassTimer = 2.2;
          }
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

        const opponentHasBall = ball.ownerId !== null && ball.ownerId.startsWith('AWAY_');
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

        const homeStepEvents = stepOutfieldAgentsTeam(
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
        if (homeStepEvents.passedToId) homePasses += 1;
        if (homeStepEvents.shotTakenBy) homeShots += 1;

        if (ball.lastTouchBy !== null && ball.lastTouchBy !== 'USER' && userQueuedCall !== null) {
          if (homeCoord.lockedPassReceiverId === 'USER' && ball.ownerId === null) {
            userQueuedCall = null;
            userQueuedCallTimer = 0;
          }
        }

        const awayStepEvents = stepOutfieldAgentsTeam(
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
        if (awayStepEvents.passedToId) awayPasses += 1;
        if (awayStepEvents.shotTakenBy) awayShots += 1;

        const pickSafeGkOutlet = (
          gkPos: THREE.Vector3,
          mates: TacticalParticipantSnapshot[],
          opps: TacticalParticipantSnapshot[],
          fallbackZ: number,
        ): THREE.Vector3 => {
          for (const m of mates) {
            const d = Math.hypot(m.pos.x - gkPos.x, m.pos.z - gkPos.z);
            if (d < 9 || d > 32) continue;
            if (evaluatePassLaneSafety01(gkPos.x, gkPos.z, m.pos.x, m.pos.z, 23, opps) >= 0.72) {
              return m.pos;
            }
          }
          return new THREE.Vector3((Math.random() - 0.5) * 16, 0, fallbackZ);
        };

        const gkSkillAway = Math.max(0.46, Math.min(0.76, (rivalClub.squadAvgOvr - 52) / 42));
        const gkSkillHome = Math.max(0.48, Math.min(0.78, (homeClub.squadAvgOvr - 50) / 42));

        const awaySave = stepGoalkeeperAI(
          awayGk,
          ball,
          pickSafeGkOutlet(awayGk.pos, awaySnapshots, homeSnapshots, -6),
          userStep.triggeredFakeShotDirX,
          gkSkillAway,
          dt,
          timeSec,
        );
        if (awaySave.madeSave) awaySaves += 1;

        const homeSave = stepGoalkeeperAI(
          homeGk,
          ball,
          pickSafeGkOutlet(homeGk.pos, homeSnapshots, awaySnapshots, 6),
          null,
          gkSkillHome,
          dt,
          timeSec,
        );
        if (homeSave.madeSave) homeSaves += 1;

        const ballEvents = stepBallPhysics(ball, dt);

        if (ballEvents.hitPost) {
          playPostClangSfx();
          showTicker('NA TRAVE!', '#FACC15', 1.1);
        }

        if (ballEvents.scoredNorthGoal) {
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

          pendingGoalScorerBanner = `GOL DO ${homeClub.shortName} • ${scorerLabel}${
            assistId ? ` (ASSIST: ${actorNameMap.get(assistId)})` : ''
          }`;
          pendingKickoffTeam = 'AWAY';
          showTicker(`⚽ GOL! ${scorerLabel}`, '#2DBE60', 1.5);
          celebrationTimer = 1.4;
        } else if (ballEvents.scoredSouthGoal) {
          playWhistleSfx(true);
          awayGoals += 1;
          const scorerId = ball.lastTouchBy ?? '';
          const scorerLabel = actorNameMap.get(scorerId) ?? rivalClub.shortName;
          pendingGoalScorerBanner = `GOL DO ${rivalClub.shortName} • ${scorerLabel}`;
          pendingKickoffTeam = 'HOME';
          showTicker(`GOL DO ${rivalClub.shortName} • ${scorerLabel}`, '#EF4444', 1.5);
          celebrationTimer = 1.4;
        } else if (ballEvents.wentOutOfBounds) {
          prepareSetPieceFromOut(ball.pos.clone());
        }
      }

      stadium.ballMesh.position.copy(ball.pos);
      stadium.ballMesh.quaternion.copy(ball.quat);

      userRing.position.set(pState.pos.x, 0.03, pState.pos.z);
      userRingMat.color.set(userQueuedCall ? '#38BDF8' : '#FACC15');
      const ringPulse = userQueuedCall ? 1 + Math.sin(timeSec * 14) * 0.18 : 1;
      userRing.scale.setScalar(ringPulse);

      if (ball.ownerId && ball.ownerId !== 'USER' && ball.ownerId !== 'SET_PIECE_HOLD') {
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
        carrierRingMat.color.set(ball.ownerId.startsWith('HOME_') ? '#2DBE60' : '#EF4444');
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

      if (!activeSetPiece && (half === 1 || half === 2)) {
        liveActorStatesBuffer[0].x = pState.pos.x;
        liveActorStatesBuffer[0].z = pState.pos.z;
        liveActorStatesBuffer[0].yaw = pState.facingYaw;
        liveActorStatesBuffer[0].pose = userPose;
        liveActorStatesBuffer[0].speed = uSpeed;
        liveActorStatesBuffer[0].animParam = animParam;
        liveActorStatesBuffer[0].useLeftFoot = animUseLeftFoot;

        liveActorStatesBuffer[1].x = homeGk.pos.x;
        liveActorStatesBuffer[1].z = homeGk.pos.z;
        liveActorStatesBuffer[1].yaw = homeGk.actor.root.rotation.y;
        liveActorStatesBuffer[1].pose =
          homeGk.diveDir !== 0 ? (homeGk.diveDir === 1 ? 'GK_DIVE_LEFT' : 'GK_DIVE_RIGHT') : 'GK_READY';
        liveActorStatesBuffer[1].speed = Math.hypot(homeGk.vel.x, homeGk.vel.z);
        liveActorStatesBuffer[1].animParam = homeGk.diveHeight01;
        liveActorStatesBuffer[1].useLeftFoot = false;

        liveActorStatesBuffer[2].x = awayGk.pos.x;
        liveActorStatesBuffer[2].z = awayGk.pos.z;
        liveActorStatesBuffer[2].yaw = awayGk.actor.root.rotation.y;
        liveActorStatesBuffer[2].pose =
          awayGk.diveDir !== 0 ? (awayGk.diveDir === -1 ? 'GK_DIVE_LEFT' : 'GK_DIVE_RIGHT') : 'GK_READY';
        liveActorStatesBuffer[2].speed = Math.hypot(awayGk.vel.x, awayGk.vel.z);
        liveActorStatesBuffer[2].animParam = awayGk.diveHeight01;
        liveActorStatesBuffer[2].useLeftFoot = false;

        let cursorIdx = 3;
        for (const ag of homeAgents) {
          const sp = Math.hypot(ag.vel.x, ag.vel.z);
          liveActorStatesBuffer[cursorIdx].x = ag.pos.x;
          liveActorStatesBuffer[cursorIdx].z = ag.pos.z;
          liveActorStatesBuffer[cursorIdx].yaw = ag.facingYaw;
          liveActorStatesBuffer[cursorIdx].pose =
            ag.kickAnimTimer > 0 ? 'KICK' : sp > 0.22 ? 'RUN' : 'IDLE';
          liveActorStatesBuffer[cursorIdx].speed = sp;
          liveActorStatesBuffer[cursorIdx].animParam = 0;
          liveActorStatesBuffer[cursorIdx].useLeftFoot = ag.profile.preferredFoot === 'ESQUERDA';
          cursorIdx += 1;
        }
        for (const ag of awayAgents) {
          const sp = Math.hypot(ag.vel.x, ag.vel.z);
          liveActorStatesBuffer[cursorIdx].x = ag.pos.x;
          liveActorStatesBuffer[cursorIdx].z = ag.pos.z;
          liveActorStatesBuffer[cursorIdx].yaw = ag.facingYaw;
          liveActorStatesBuffer[cursorIdx].pose =
            ag.kickAnimTimer > 0 ? 'KICK' : sp > 0.22 ? 'RUN' : 'IDLE';
          liveActorStatesBuffer[cursorIdx].speed = sp;
          liveActorStatesBuffer[cursorIdx].animParam = 0;
          liveActorStatesBuffer[cursorIdx].useLeftFoot = ag.profile.preferredFoot === 'ESQUERDA';
          cursorIdx += 1;
        }

        replayRecorder.recordFrame(
          ball.pos,
          ball.vel,
          ball.quat,
          ball.ownerId,
          ball.netRipple,
          ball.netHitPoint,
          liveActorStatesBuffer,
        );
      }

      stadium.updateDynamicElements(
        timeSec,
        ball.netRipple,
        ball.netHitPoint,
        celebrationTimer > 0 && ball.enteredGoalSide === 'NORTH',
        false,
      );

      const targetCamPos = new THREE.Vector3();
      const targetLook = new THREE.Vector3();

      if (cameraPreset === 'BROADCAST_TV') {
        const focusZ = Math.max(-PITCH.HALF_L + 13, Math.min(PITCH.HALF_L - 13, ball.pos.z * 0.8));
        const depthOffset = ball.pos.x * 0.16;
        targetCamPos.set(41.5 + depthOffset, 22.8, focusZ);
        targetLook.set(ball.pos.x * 0.28, 0.7, focusZ);
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

      smoothCamPos.lerp(targetCamPos, Math.min(1, 9.5 * dt));
      smoothCamLook.lerp(targetLook, Math.min(1, 12.5 * dt));
      camera.position.copy(smoothCamPos);
      camera.lookAt(smoothCamLook);

      renderer.render(scene, camera);

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

        const regCapMin = half === 1 || half === 'HT' ? 45 : 90;
        const rawMin = Math.floor(matchClockSeconds / 60);
        const inStoppage = (half === 1 && rawMin >= 45) || (half === 2 && rawMin >= 90);
        const totalPoss = Math.max(1, homePossTime + awayPossTime);
        const homePct = Math.round((homePossTime / totalPoss) * 100);

        setHud({
          homeGoals,
          awayGoals,
          userGoals,
          userAssists,
          matchMinute: inStoppage ? regCapMin : rawMin,
          matchSecond: Math.floor(matchClockSeconds % 60),
          stoppageMinutes,
          inStoppageTime: inStoppage,
          half,
          paused,
          pauseTab,
          pauseMenuIndex,
          isReplayActive: false,
          replayAngle,
          replayScorerText: '',
          stamina: pState.stamina,
          maxStamina: pState.maxStamina,
          powerPct: pState.hudPower01 * 100,
          cameraPreset,
          radarMode,
          homeFormationLabel: homeFormation.id,
          awayFormationLabel: awayFormation.id,
          scorebugTicker: tickerObj,
          ballX: ball.pos.x,
          ballZ: ball.pos.z,
          userX: pState.pos.x,
          radarDots,
          stats: {
            homePossessionPct: homePct,
            awayPossessionPct: 100 - homePct,
            homeShots,
            awayShots,
            homePasses,
            awayPasses,
            homeTackles,
            awayTackles,
            homeSaves,
            awaySaves,
            homeCorners,
            awayCorners,
            userPasses,
            userTackles,
          },
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
      <div ref={canvasHostRef} className="absolute inset-0 w-full h-full" />

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
        onResume={() => controlsRef.current.resume()}
        onTogglePause={() => controlsRef.current.togglePause()}
        onOpenSettingsTab={(tab) => controlsRef.current.openSettingsTab(tab)}
        onLaunchInstantReplay={() => controlsRef.current.launchInstantReplay()}
        onCycleReplayAngle={() => controlsRef.current.cycleReplayAngle()}
        onCycleCamera={() => controlsRef.current.cycleCamera()}
        onCycleRadarMode={() => controlsRef.current.cycleRadarMode()}
        onSkipReplay={() => controlsRef.current.skipReplay()}
        onRestartMatch={() => controlsRef.current.restartMatch()}
        onExit={onExit}
      />
    </div>
  );
};
