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
import { ArenaHudSnapshot, ArenaSessionProps, CameraLockMode } from '../types';
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

  const [hud, setHud] = useState<ArenaHudSnapshot>({
    cameraMode: 'BALL_CAM',
    stamina: player.stamina,
    shotPowerPct: 0,
    chargingFinesse: false,
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
          : mode === 'TRAINING_SESSION'
            ? 'TREINO DE CAMPO — MIRE NA GAVETA!'
            : 'ARENA 3D LIVRE — CLIQUE NA TELA OU USE O CONTROLE!',
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

    // 1. Cena Three.js de Estádio Noturno (inspirada diretamente na nossa arte de referência!)
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#071226');
    scene.fog = new THREE.FogExp2('#071226', 0.0055);

    const camera = new THREE.PerspectiveCamera(52, 1, 0.15, 240);
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    host.appendChild(renderer.domElement);

    // Iluminação vibrante dos 4 refletores do estádio
    scene.add(new THREE.HemisphereLight('#E0F2FE', '#14532D', 1.25));
    const floodMain = new THREE.DirectionalLight('#FFFBEB', 1.75);
    floodMain.position.set(18, 34, 22);
    scene.add(floodMain);

    const floodRim = new THREE.DirectionalLight('#60A5FA', 0.85);
    floodRim.position.set(-24, 26, -32);
    scene.add(floodRim);

    // 2. Estádio + Seu Atleta + Companheiro Camisa 8 + Goleiro Adversário
    const stadium = buildStadium3D(activeClub, compTheme);
    scene.add(stadium.root);

    const userActor = createPitchFootballerActor(activePlayer, activeClub);
    scene.add(userActor.root);

    const mateBrain = createSupportTeammate(activeClub);
    scene.add(mateBrain.actor.root);

    const rivalKeeperClub = getClubById('real_madrid_86');
    const gkBrain = createGoalkeeperAI(rivalKeeperClub);
    scene.add(gkBrain.actor.root);

    // 3. Estados Vivos de Física e Câmera em 3ª Pessoa
    const ball = createInitialBallState(0, -13);
    const pState = createInitialPlayerPitchState(activePlayer.stamina);
    const inputCollector = new PitchInputCollector();
    inputCollector.attach(host);

    let camMode: CameraLockMode = 'BALL_CAM';
    let camYaw = 0; // 0 = olhando reto pro Gol Norte (-Z)
    let camPitch = 0.24;
    let manualAimOffsetYaw = 0;
    const smoothCamPos = new THREE.Vector3(0, 2.6, -4.8);
    const smoothCamLook = new THREE.Vector3(0, 1.1, -22);

    let celebrationTimer = 0;
    let playResetTimer = 0;
    let bannerTimer = 2.4;
    let bannerObj: { text: string; color: string } | null = {
      text:
        mode === 'TRYOUT_PRO'
          ? 'SELETIVA PRO — FAÇA GOLS E ACERTE OS ÂNGULOS!'
          : mode === 'TRAINING_SESSION'
            ? 'SESSÃO 100% — TABELINHA (A/Y/X) E FINALIZAÇÃO (B)!'
            : 'ARENA LIVRE 3D — BOM JOGO!',
      color: compTheme.accentPrimary,
    };
    let timeLeft = mode === 'FREE_PLAY' ? 0 : 95;
    let assistArmed = false;

    const showBanner = (text: string, color: string, dur = 1.8) => {
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
      pState.shotCharge01 = 0;

      ball.pos.set(preset.bx, PITCH.BALL_RADIUS, preset.bz);
      ball.vel.set(0, 0, 0);
      ball.spin.set(0, 0, 0);
      ball.ownerId = null;
      ball.touchCooldown = 0;

      mateBrain.pos.set(preset.mx, 0, preset.mz);
      mateBrain.vel.set(0, 0, 0);
      gkBrain.pos.set(0, 0, -PITCH.HALF_L + 0.78);
      gkBrain.diveTimer = 0;
      gkBrain.diveDir = 0;

      assistArmed = false;
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

      if (inp.toggleCameraJustPressed) {
        camMode = camMode === 'BALL_CAM' ? 'FREE_CAM' : 'BALL_CAM';
        manualAimOffsetYaw = 0;
      }
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

      // 4. Atualização da Câmera em 3ª Pessoa (Trava Inteligente na Bola/Gol OU Livre 360°!)
      if (camMode === 'BALL_CAM') {
        manualAimOffsetYaw = Math.max(
          -0.65,
          Math.min(0.65, manualAimOffsetYaw - inp.lookDeltaX * 0.9),
        );
        if (Math.abs(inp.lookDeltaX) < 0.001) {
          manualAimOffsetYaw *= Math.max(0, 1 - 2.2 * dt);
        }
        camPitch = Math.max(0.12, Math.min(0.48, camPitch + inp.lookDeltaY * 0.7));

        // Quando você está com a bola no pé, enquadra o Gol Norte; quando sem bola, olha para a bola!
        const focusTargetX = ball.ownerId === 'USER' ? 0 : ball.pos.x * 0.75;
        const focusTargetZ = ball.ownerId === 'USER' ? -PITCH.HALF_L : ball.pos.z * 0.8 - 8;
        const dx = focusTargetX - pState.pos.x;
        const dz = focusTargetZ - pState.pos.z;
        const autoYaw = Math.atan2(-dx, -dz) + manualAimOffsetYaw;
        camYaw += shortestYawDelta(camYaw, autoYaw) * Math.min(1, 7.5 * dt);
      } else {
        camYaw -= inp.lookDeltaX;
        camPitch = Math.max(0.08, Math.min(0.62, camPitch + inp.lookDeltaY));
      }

      // 5. Simulação de Jogador, Companheiro, Goleiro e Bola 240Hz
      if (celebrationTimer > 0) {
        celebrationTimer -= dt;
        pState.vel.multiplyScalar(0.92);
        pState.pos.addScaledVector(pState.vel, dt);
        stepBallPhysics(ball, dt);
        if (celebrationTimer <= 0) {
          respawnPlay(true);
        }
      } else {
        const { calledForBall } = stepPlayerAndBallControl(
          pState,
          activePlayer,
          ball,
          inp,
          camYaw,
          mateBrain.pos,
          dt,
        );

        const mateStep = stepSupportTeammateAI(
          mateBrain,
          ball,
          pState.pos,
          pState.vel,
          calledForBall,
          dt,
          timeSec,
        );
        if (mateStep.deliveredAssistPass) {
          assistArmed = true;
        }

        const gkDifficulty = mode === 'TRYOUT_PRO' ? 0.45 : 0.58;
        const { madeSave } = stepGoalkeeperAI(
          gkBrain,
          ball,
          pState.pos,
          gkDifficulty,
          dt,
          timeSec,
        );

        if (madeSave && playResetTimer <= 0) {
          statsRef.current.saves += 1;
          statsRef.current.points += 15; // Chute no alvo defendido ainda soma moral leve!
          showBanner('DEFESAÇA DO GOLEIRO! CONTINUE NO REBOTE!', '#F59E0B', 1.5);
        }

        const ballEvents = stepBallPhysics(ball, dt);

        if (ballEvents.hitPost) {
          playPostClangSfx();
          showBanner('EXPLODIU NA TRAVE!', '#FACC15', 1.4);
        }

        if (ballEvents.scoredNorthGoal && celebrationTimer <= 0) {
          playGoalRoarSfx();
          statsRef.current.goals += 1;

          // Checa se entrou na GAVETA (ângulos superiores com os anéis dourados!)
          const hitTopCorner =
            Math.abs(ball.pos.x) > PITCH.GOAL_HALF_W - 1.55 &&
            ball.pos.y > PITCH.GOAL_HEIGHT - 1.15;

          const bonus = hitTopCorner ? 145 : assistArmed ? 115 : 95;
          statsRef.current.points += bonus;

          showBanner(
            hitTopCorner
              ? `GOLAÇO NA GAVETA! (+${bonus} PTS)`
              : assistArmed
                ? `GOL DE TABELINHA! (+${bonus} PTS)`
                : `GOOOOOL! (+${bonus} PTS)`,
            '#2DBE60',
            2.1,
          );
          celebrationTimer = 2.0;
        } else if (ballEvents.wentOutOfBounds && playResetTimer <= 0) {
          playResetTimer = 0.85;
          showBanner('BOLA FORA • REPONDO JOGADA...', '#9498A3', 0.85);
        }

        if (playResetTimer > 0) {
          playResetTimer -= dt;
          if (playResetTimer <= 0) {
            respawnPlay(true);
          }
        }
      }

      // 6. Sincroniza Malhas 3D e Animações Procedurais
      stadium.ballMesh.position.copy(ball.pos);
      stadium.ballMesh.quaternion.copy(ball.quat);

      userActor.root.position.copy(pState.pos);
      userActor.root.rotation.y = pState.facingYaw;

      const uSpeed = Math.hypot(pState.vel.x, pState.vel.z);
      const userPose: PitchPoseState =
        celebrationTimer > 0
          ? 'CELEBRATE'
          : pState.slideTimer > 0
            ? 'SLIDE'
            : pState.kickAnimTimer > 0
              ? 'KICK'
              : pState.shotCharge01 > 0.04
                ? 'CHARGE'
                : uSpeed > 0.35
                  ? 'RUN'
                  : 'IDLE';

      animatePitchActor(
        userActor.rig,
        userPose,
        uSpeed,
        pState.shotCharge01,
        activePlayer.preferredFoot === 'ESQUERDA',
        timeSec,
      );

      stadium.updateDynamicElements(
        timeSec,
        ball.netRipple,
        ball.netHitPoint,
        celebrationTimer > 0,
        mode !== 'FREE_PLAY',
      );

      // Posicionamento suave da câmera 3ª pessoa atrás do jogador!
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

      // Atualiza HUD React a ~20Hz para não pesar o loop 60fps
      hudSyncAcc += dt;
      if (hudSyncAcc >= 0.05) {
        hudSyncAcc = 0;
        setHud({
          cameraMode: camMode,
          stamina: pState.stamina,
          shotPowerPct: pState.shotCharge01 * 100,
          chargingFinesse: pState.chargingFinesse,
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
        playerName={player.shirtName}
        shirtNumber={player.shirtNumber}
        hud={hud}
        accentColor={compTheme.accentPrimary}
        onResetBall={() => triggerResetSpawnRef.current?.()}
        onFinishNow={finishWithCurrentScore}
        onExitCancel={onCancel}
      />
    </div>
  );
};
