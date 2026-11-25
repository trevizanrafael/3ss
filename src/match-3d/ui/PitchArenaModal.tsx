import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { getClubById } from '../../data/clubs';
import { getCompetitionTheme } from '../../data/world/competitionThemes';
import { StarRating } from '../../shared/types/common';
import { createGoalkeeperAI, stepGoalkeeperAI } from '../actors/goalkeeperAI';
import {
  animatePitchActor,
  createPitchFootballerActor,
  PitchPoseState,
} from '../actors/pitchActorRig';
import {
  createSupportTeammate,
  stepSupportTeammateAI,
} from '../actors/teammateSupportAI';
import {
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
import { ArenaHudSnapshot, ArenaSessionProps, KickKind } from '../types';
import { PitchHudOverlay } from './PitchHudOverlay';

function computeEarnedStars(points: number, mode: ArenaSessionProps['mode']): StarRating {
  if (mode === 'TRYOUT_PRO') {
    if (points >= 340) return 3;
    if (points >= 200) return 2;
    if (points >= 90) return 1;
    return 0;
  }
  if (points >= 300) return 3;
  if (points >= 160) return 2;
  return 1;
}

function shortestYawDelta(from: number, to: number): number {
  let d = ((to - from + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

const SPAWN_PRESETS: { px: number; pz: number; bx: number; bz: number; mx: number; mz: number }[] = [
  { px: 0, pz: -11, bx: 0, bz: -13, mx: 10.5, mz: -16 },
  { px: -9.5, pz: -15, bx: -8.5, bz: -16.5, mx: 4.5, mz: -21 },
  { px: 9.5, pz: -15, bx: 8.5, bz: -16.5, mx: -4.5, mz: -21 },
  { px: 0, pz: -20, bx: 0, bz: -21.5, mx: 11.5, mz: -25 },
  { px: -13, pz: -10, bx: -11.5, bz: -12, mx: 2, mz: -18 },
];

export const PitchArenaModal: React.FC<ArenaSessionProps> = ({
  mode,
  player,
  club,
  competitionId,
  onFinishSession,
  onCancel,
}) => {
  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const compTheme = getCompetitionTheme(competitionId ?? club.leagueId);
  const maxAttempts = mode === 'TRYOUT_PRO' ? 8 : mode === 'TRAINING_SESSION' ? 8 : 999;
  const initialStaminaCap = Math.max(25, Math.min(100, player.stamina));

  const [hud, setHud] = useState<ArenaHudSnapshot>({
    stamina: initialStaminaCap,
    maxStamina: initialStaminaCap,
    powerPct: 0,
    hasBall: false,
    goals: 0,
    saves: 0,
    comboPoints: 0,
    attemptsDone: 0,
    maxAttempts,
    timeRemainingSec: mode === 'FREE_PLAY' ? 0 : 95,
    currentStars: mode === 'TRAINING_SESSION' ? 1 : 0,
    bannerFeedback: {
      text:
        mode === 'TRYOUT_PRO'
          ? 'SELETIVA PRO — MOSTRE SEU FUTEBOL!'
          : 'ARENA LIVRE 3D — BOM JOGO!',
      color: compTheme.accentPrimary,
    },
  });

  const statsRef = useRef({
    goals: 0,
    saves: 0,
    points: 0,
    attempts: 0,
    finished: false,
  });

  const triggerResetSpawnRef = useRef<(() => void) | null>(null);
  const callbacksRef = useRef({ onFinishSession, onCancel, player, club });
  callbacksRef.current = { onFinishSession, onCancel, player, club };

  const finishWithCurrentScore = useCallback(() => {
    if (statsRef.current.finished) return;
    statsRef.current.finished = true;
    playWhistleSfx(true);
    const stars = computeEarnedStars(statsRef.current.points, mode);
    callbacksRef.current.onFinishSession(stars, statsRef.current.goals);
  }, [mode]);

  useEffect(() => {
    const host = canvasHostRef.current;
    if (!host) return;
    const activePlayer = callbacksRef.current.player;
    const activeClub = callbacksRef.current.club;

    playWhistleSfx(false);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#071226');
    scene.fog = new THREE.FogExp2('#071226', 0.0055);

    const camera = new THREE.PerspectiveCamera(52, 1, 0.15, 240);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.domElement.style.display = 'block';
    host.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight('#E0F2FE', '#14532D', 1.25));
    const floodMain = new THREE.DirectionalLight('#FFFBEB', 1.75);
    floodMain.position.set(18, 34, 22);
    scene.add(floodMain);

    const floodRim = new THREE.DirectionalLight('#60A5FA', 0.85);
    floodRim.position.set(-24, 26, -32);
    scene.add(floodRim);

    const stadium = buildStadium3D(activeClub, compTheme);
    scene.add(stadium.root);

    const userActor = createPitchFootballerActor(activePlayer, activeClub);
    scene.add(userActor.root);

    const mateBrain = createSupportTeammate(activeClub);
    scene.add(mateBrain.actor.root);

    const rivalKeeperClub = getClubById('real_madrid_86');
    const gkBrain = createGoalkeeperAI(rivalKeeperClub);
    scene.add(gkBrain.actor.root);

    const ball = createInitialBallState(0, -13);
    const pState = createInitialPlayerPitchState(activePlayer.stamina);
    const inputCollector = new PitchInputCollector();
    inputCollector.attach(host);

    let camYaw = 0;
    let camPitch = 0.24;
    let manualAimOffsetYaw = 0;
    const smoothCamPos = new THREE.Vector3(0, 2.6, -4.8);
    const smoothCamLook = new THREE.Vector3(0, 1.1, -22);

    let celebrationTimer = 0;
    let playResetTimer = 0;
    let bannerTimer = 2.0;
    let bannerObj: { text: string; color: string } | null = {
      text:
        mode === 'TRYOUT_PRO'
          ? 'SELETIVA PRO — FAÇA GOLS E TABELE!'
          : 'ARENA LIVRE 3D — BOM JOGO!',
      color: compTheme.accentPrimary,
    };
    let timeLeft = mode === 'FREE_PLAY' ? 0 : 95;
    let mateAssistArmed = false;
    let userAssistArmed = false;
    let lastUserShotKind: KickKind | null = null;

    const showBanner = (text: string, color: string, dur = 1.6) => {
      bannerObj = { text, color };
      bannerTimer = dur;
    };

    const respawnPlay = (advanceAttempt: boolean) => {
      if (advanceAttempt && mode !== 'FREE_PLAY') {
        statsRef.current.attempts += 1;
        if (statsRef.current.attempts >= maxAttempts) {
          finishWithCurrentScore();
          return;
        }
      }

      const preset = SPAWN_PRESETS[statsRef.current.attempts % SPAWN_PRESETS.length];
      pState.pos.set(preset.px, 0, preset.pz);
      pState.vel.set(0, 0, 0);
      pState.facingYaw = Math.atan2(-preset.px, -PITCH.HALF_L - preset.pz);
      pState.powerCharge01 = 0;
      pState.chargeIntent = null;
      pState.windupTimer = 0;
      pState.lockedIntent = null;
      pState.fakeShotAnimTimer = 0;
      pState.hudPower01 = 0;

      ball.pos.set(preset.bx, PITCH.BALL_RADIUS, preset.bz);
      ball.vel.set(0, 0, 0);
      ball.spin.set(0, 0, 0);
      ball.ownerId = null;
      ball.lastTouchBy = null;
      ball.touchCooldown = 0;
      ball.enteredGoalSide = null;

      mateBrain.pos.set(preset.mx, 0, preset.mz);
      mateBrain.vel.set(0, 0, 0);
      mateBrain.receivedFromUser = false;
      mateBrain.shotCooldown = 0;
      mateBrain.queuedCall = null;
      mateBrain.queuedCallTimer = 0;
      mateBrain.throughRunTarget = null;
      mateBrain.throughRunTimer = 0;

      gkBrain.pos.set(0, 0, -PITCH.HALF_L + 0.75);
      gkBrain.vel.set(0, 0, 0);
      gkBrain.diveTimer = 0;
      gkBrain.diveDir = 0;
      gkBrain.inSpreadStance = false;
      gkBrain.trackingShotActive = false;
      gkBrain.shotReactionTimer = 0;
      gkBrain.recentSaveTimer = 0;

      mateAssistArmed = false;
      userAssistArmed = false;
      lastUserShotKind = null;
      celebrationTimer = 0;
      playResetTimer = 0;
    };

    triggerResetSpawnRef.current = () => respawnPlay(false);

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
        respawnPlay(false);
      }
      if (inp.exitOrFinishJustPressed) {
        if (mode === 'FREE_PLAY' && callbacksRef.current.onCancel) {
          callbacksRef.current.onCancel();
          return;
        }
        finishWithCurrentScore();
        return;
      }

      if (mode !== 'FREE_PLAY' && !statsRef.current.finished) {
        timeLeft = Math.max(0, timeLeft - dt);
        if (timeLeft <= 0) {
          finishWithCurrentScore();
          return;
        }
      }

      if (bannerTimer > 0) {
        bannerTimer -= dt;
        if (bannerTimer <= 0) bannerObj = null;
      }

      manualAimOffsetYaw = Math.max(
        -0.95,
        Math.min(0.95, manualAimOffsetYaw - inp.lookDeltaX * 0.95),
      );
      if (Math.abs(inp.lookDeltaX) < 0.001) {
        manualAimOffsetYaw *= Math.max(0, 1 - 2.2 * dt);
      }
      camPitch = Math.max(0.12, Math.min(0.48, camPitch + inp.lookDeltaY * 0.7));

      const focusTargetX = ball.ownerId === 'USER' ? 0 : ball.pos.x * 0.8;
      const focusTargetZ = ball.ownerId === 'USER' ? -PITCH.HALF_L : ball.pos.z * 0.85 - 7;
      const dx = focusTargetX - pState.pos.x;
      const dz = focusTargetZ - pState.pos.z;
      const autoYaw = Math.atan2(-dx, -dz) + manualAimOffsetYaw;
      camYaw += shortestYawDelta(camYaw, autoYaw) * Math.min(1, 7.5 * dt);

      if (celebrationTimer > 0) {
        celebrationTimer -= dt;
        pState.vel.multiplyScalar(0.92);
        pState.pos.addScaledVector(pState.vel, dt);
        stepBallPhysics(ball, dt);
        if (celebrationTimer <= 0) {
          respawnPlay(true);
        }
      } else {
        const {
          kicked,
          calledForBall,
          commandedMateShoot,
          triggeredFakeShotDirX,
          throughBallTarget,
        } = stepPlayerAndBallControl(
          pState,
          activePlayer,
          ball,
          inp,
          camYaw,
          mateBrain.pos,
          mateBrain.vel,
          gkBrain.pos,
          dt,
        );

        if (throughBallTarget) {
          mateBrain.throughRunTarget = throughBallTarget;
          mateBrain.throughRunTimer = 2.2;
        }

        if (kicked === 'POWER_SHOT' || kicked === 'FINESSE_SHOT' || kicked === 'CHIP_SHOT') {
          lastUserShotKind = kicked;
        } else if (kicked) {
          lastUserShotKind = null;
          userAssistArmed = false;
        }

        const mateStep = stepSupportTeammateAI(
          mateBrain,
          ball,
          pState.pos,
          pState.vel,
          gkBrain.pos,
          calledForBall,
          commandedMateShoot,
          dt,
          timeSec,
        );
        if (mateStep.deliveredAssistPass) {
          mateAssistArmed = true;
          userAssistArmed = false;
        }
        if (mateStep.shotByMateFromUserPass) {
          userAssistArmed = true;
          mateAssistArmed = false;
          lastUserShotKind = null;
        }

        const gkDifficulty = mode === 'TRYOUT_PRO' ? 0.52 : 0.62;
        const { madeSave, caughtFirmly } = stepGoalkeeperAI(
          gkBrain,
          ball,
          pState.pos,
          triggeredFakeShotDirX,
          gkDifficulty,
          dt,
          timeSec,
        );

        if (madeSave && playResetTimer <= 0) {
          statsRef.current.saves += 1;
          statsRef.current.points += 12;
          showBanner(
            caughtFirmly ? 'GOLEIRO ENCAIXOU!' : 'ESPALMOU! OLHA O REBOTE!',
            '#F59E0B',
            1.3,
          );
        }

        const ballEvents = stepBallPhysics(ball, dt);

        if (ballEvents.hitPost) {
          playPostClangSfx();
          showBanner('NA TRAVE!', '#FACC15', 1.3);
        }

        if (ballEvents.scoredNorthGoal && celebrationTimer <= 0) {
          playGoalRoarSfx();
          statsRef.current.goals += 1;

          const hitTopCorner =
            Math.abs(ball.pos.x) > PITCH.GOAL_HALF_W - 1.85 &&
            ball.pos.y > PITCH.GOAL_HEIGHT - 1.25;

          const scoredByMate = ball.lastTouchBy === 'MATE';
          const wasChip = !scoredByMate && lastUserShotKind === 'CHIP_SHOT';
          const bonus = hitTopCorner
            ? 145
            : wasChip
              ? 135
              : scoredByMate && userAssistArmed
                ? 125
                : mateAssistArmed
                  ? 115
                  : 95;
          statsRef.current.points += bonus;

          showBanner(
            wasChip
              ? `GOLAÇO DE CAVADINHA! (+${bonus} PTS)`
              : hitTopCorner
                ? `GOLAÇO NA GAVETA! (+${bonus} PTS)`
                : scoredByMate && userAssistArmed
                  ? `GOL DO APOIO • SUA ASSISTÊNCIA! (+${bonus} PTS)`
                  : mateAssistArmed
                    ? `GOL DE TABELINHA! (+${bonus} PTS)`
                    : `GOOOOOL! (+${bonus} PTS)`,
            '#2DBE60',
            2.0,
          );
          celebrationTimer = 2.0;
        } else if (ballEvents.wentOutOfBounds && playResetTimer <= 0) {
          playResetTimer = 0.85;
          showBanner('BOLA FORA • REPONDO...', '#9498A3', 0.85);
        }

        if (playResetTimer > 0) {
          playResetTimer -= dt;
          if (playResetTimer <= 0) {
            respawnPlay(true);
          }
        }
      }

      stadium.ballMesh.position.copy(ball.pos);
      stadium.ballMesh.quaternion.copy(ball.quat);

      userActor.root.position.copy(pState.pos);
      userActor.root.rotation.y = pState.facingYaw;

      const uSpeed = Math.hypot(pState.vel.x, pState.vel.z);
      const fakeShotProgress =
        pState.fakeShotAnimTimer > 0 ? 1 - pState.fakeShotAnimTimer / 0.34 : 0;

      const userPose: PitchPoseState =
        celebrationTimer > 0
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

      const animUseLeftFoot =
        userPose === 'KICK' || userPose === 'FAKE_SHOT'
          ? pState.lastKickUsedLeftFoot
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
        celebrationTimer > 0,
        mode !== 'FREE_PLAY',
      );

      const camForwardX = -Math.sin(camYaw);
      const camForwardZ = -Math.cos(camYaw);
      const camDist = 5.6 + camPitch * 2.2;
      const camHeight = 1.65 + camPitch * 4.2;

      const targetCamPos = new THREE.Vector3(
        pState.pos.x - camForwardX * camDist,
        pState.pos.y + camHeight,
        pState.pos.z - camForwardZ * camDist,
      );
      const targetLook = new THREE.Vector3(
        pState.pos.x + camForwardX * 6.5,
        pState.pos.y + 1.15,
        pState.pos.z + camForwardZ * 6.5,
      );

      smoothCamPos.lerp(targetCamPos, Math.min(1, 11 * dt));
      smoothCamLook.lerp(targetLook, Math.min(1, 14 * dt));
      camera.position.copy(smoothCamPos);
      camera.lookAt(smoothCamLook);

      renderer.render(scene, camera);

      hudSyncAcc += dt;
      if (hudSyncAcc >= 0.04) {
        hudSyncAcc = 0;
        setHud({
          stamina: pState.stamina,
          maxStamina: pState.maxStamina,
          powerPct: pState.hudPower01 * 100,
          hasBall: ball.ownerId === 'USER',
          goals: statsRef.current.goals,
          saves: statsRef.current.saves,
          comboPoints: statsRef.current.points,
          attemptsDone: statsRef.current.attempts,
          maxAttempts,
          timeRemainingSec: timeLeft,
          currentStars: computeEarnedStars(statsRef.current.points, mode),
          bannerFeedback: bannerObj,
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
      mateBrain.actor.dispose();
      gkBrain.actor.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === host) {
        host.removeChild(renderer.domElement);
      }
    };
  }, [club.id, compTheme, finishWithCurrentScore, maxAttempts, mode]);

  return (
    <div
      data-modal-scope="true"
      data-pitch-3d-active="true"
      className="fixed inset-0 z-50 w-screen h-screen bg-[#071226] overflow-hidden"
    >
      <div ref={canvasHostRef} className="absolute inset-0 w-full h-full cursor-crosshair" />

      <PitchHudOverlay
        mode={mode}
        club={club}
        hud={hud}
        accentColor={compTheme.accentPrimary}
        onResetBall={() => triggerResetSpawnRef.current?.()}
        onFinishNow={finishWithCurrentScore}
        onExitCancel={onCancel}
      />
    </div>
  );
};
