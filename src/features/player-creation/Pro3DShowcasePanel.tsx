import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { getNationalTeamByCountry } from '../../data/clubs';
import { COUNTRIES, TRYOUT_LEAGUE_COUNTRIES } from '../../data/countries/countries';
import { CareerPlayer } from '../../domains/player/playerTypes';
import { computeFifaMacroStats } from '../../domains/training/trainingDrillsCatalog';
import { GamepadBadge } from '../../shared/gamepad/GamepadBadge';
import {
  AnimatedRigHandles,
  buildBlockyArcadeFootballer3D,
} from '../../shared/three/player3DBuilder';
import { ClubCrest } from '../../shared/ui/ClubCrest';
import { CountryFlag } from '../../shared/ui/CountryFlag';
import { getFifaStatColor } from '../../shared/ui/FifaStatBadge';

export type ShowcaseCameraPreset = 'FULL_FRONT' | 'FULL_BACK' | 'HEAD_CLOSEUP';

interface Pro3DShowcasePanelProps {
  previewPlayer: CareerPlayer;
  cameraPreset: ShowcaseCameraPreset;
}

export const Pro3DShowcasePanel: React.FC<Pro3DShowcasePanelProps> = ({
  previewPlayer,
  cameraPreset,
}) => {
  const canvasHostRef = useRef<HTMLDivElement | null>(null);
  const manualYawRef = useRef(-0.22);
  const targetYawRef = useRef(-0.22);
  const heightCmRef = useRef(previewPlayer.heightCm);
  heightCmRef.current = previewPlayer.heightCm;

  const [zoomFaceOverride, setZoomFaceOverride] = useState<boolean | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const celebrateRef = useRef(false);
  celebrateRef.current = celebrating;

  const activePreset: ShowcaseCameraPreset =
    zoomFaceOverride === true
      ? 'HEAD_CLOSEUP'
      : zoomFaceOverride === false
        ? cameraPreset === 'HEAD_CLOSEUP'
          ? 'FULL_FRONT'
          : cameraPreset
        : cameraPreset;

  const presetRef = useRef<ShowcaseCameraPreset>(activePreset);
  presetRef.current = activePreset;

  useEffect(() => {
    setZoomFaceOverride(null);
    if (cameraPreset === 'FULL_BACK') {
      targetYawRef.current = Math.PI;
    } else if (cameraPreset === 'HEAD_CLOSEUP') {
      targetYawRef.current = 0.1;
    } else {
      targetYawRef.current = -0.22;
    }
  }, [cameraPreset]);

  const sceneBundleRef = useRef<{
    actorHolder: THREE.Group;
    rig: AnimatedRigHandles | null;
    disposeActor?: () => void;
  } | null>(null);

  useEffect(() => {
    const host = canvasHostRef.current;
    if (!host) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 30);
    camera.position.set(0, 1.0, 3.3);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    host.appendChild(renderer.domElement);

    // Iluminação vibrante de noite de estádio igual à arte de referência!
    scene.add(new THREE.HemisphereLight('#FFFFFF', '#1E293B', 1.35));
    const stadiumKey = new THREE.DirectionalLight('#FFFBEB', 1.85);
    stadiumKey.position.set(2.4, 3.8, 3.4);
    scene.add(stadiumKey);

    const coolRim = new THREE.DirectionalLight('#60A5FA', 1.15);
    coolRim.position.set(-2.8, 2.6, -2.4);
    scene.add(coolRim);

    const actorHolder = new THREE.Group();
    scene.add(actorHolder);
    sceneBundleRef.current = { actorHolder, rig: null };

    const syncSize = () => {
      const w = Math.max(200, host.clientWidth);
      const h = Math.max(200, host.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    syncSize();
    const ro = new ResizeObserver(syncSize);
    ro.observe(host);

    let dragging = false;
    let prevX = 0;
    const onDown = (e: PointerEvent) => {
      dragging = true;
      prevX = e.clientX;
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - prevX;
      prevX = e.clientX;
      targetYawRef.current += dx * 0.012;
    };
    const onUp = () => {
      dragging = false;
    };
    host.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);

    const onRsMove = (ev: Event) => {
      const { dx } = (ev as CustomEvent<{ dx: number; dy: number }>).detail;
      if (Math.abs(dx) > 0.2) {
        targetYawRef.current += dx * 0.055;
      }
    };
    window.addEventListener('gamepad-rs-move', onRsMove);

    let rafId = 0;
    const lookCurrent = new THREE.Vector3(0, 0.85, 0);

    const animate = (nowMs: number) => {
      const t = nowMs * 0.001;
      const rig = sceneBundleRef.current?.rig;

      if (rig) {
        if (celebrateRef.current) {
          // Pose icônica de comemoração de gol de braços abertos igual à referência!
          const pulse = Math.sin(t * 4.5) * 0.04;
          rig.character.position.y = Math.abs(Math.sin(t * 4.5)) * 0.035;
          rig.headPivot.rotation.z = -0.08;
          rig.headPivot.rotation.x = -0.1 + pulse * 0.5;
          rig.leftArmPivot.rotation.z = -1.22 - pulse;
          rig.rightArmPivot.rotation.z = 1.22 + pulse;
          rig.leftArmPivot.rotation.x = -0.15;
          rig.rightArmPivot.rotation.x = -0.15;
          rig.leftForearmPivot.rotation.x = -0.12;
          rig.rightForearmPivot.rotation.x = -0.12;
          rig.leftLegPivot.rotation.x = 0.08;
          rig.rightLegPivot.rotation.x = -0.26;
        } else {
          // Respiração atlética natural em pé
          const breath = Math.sin(t * 2.4);
          rig.character.position.y = breath * 0.008;
          rig.headPivot.rotation.y = Math.sin(t * 1.1) * 0.06;
          rig.headPivot.rotation.z = 0;
          rig.headPivot.rotation.x = breath * 0.02;
          rig.leftArmPivot.rotation.z = -0.24 - breath * 0.02;
          rig.rightArmPivot.rotation.z = 0.24 + breath * 0.02;
          rig.leftArmPivot.rotation.x = -0.08;
          rig.rightArmPivot.rotation.x = -0.08;
          rig.leftForearmPivot.rotation.x = -0.26;
          rig.rightForearmPivot.rotation.x = -0.26;
          rig.leftLegPivot.rotation.x = 0;
          rig.rightLegPivot.rotation.x = 0;
        }
      }

      const p = presetRef.current;
      const hRatio = heightCmRef.current / 178;
      const desiredCamPos =
        p === 'HEAD_CLOSEUP'
          ? new THREE.Vector3(0, 1.44 * hRatio, 1.28)
          : new THREE.Vector3(0, 0.94, 3.05);
      const desiredLook =
        p === 'HEAD_CLOSEUP'
          ? new THREE.Vector3(0, 1.41 * hRatio, 0)
          : new THREE.Vector3(0, 0.84, 0);

      camera.position.lerp(desiredCamPos, 0.1);
      lookCurrent.lerp(desiredLook, 0.1);
      camera.lookAt(lookCurrent);

      manualYawRef.current += (targetYawRef.current - manualYawRef.current) * 0.12;
      actorHolder.rotation.y = manualYawRef.current;

      renderer.render(scene, camera);
      rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      host.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('gamepad-rs-move', onRsMove);
      sceneBundleRef.current?.disposeActor?.();
      sceneBundleRef.current = null;
      renderer.dispose();
      if (renderer.domElement.parentNode === host) {
        host.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    const bundle = sceneBundleRef.current;
    if (!bundle) return;
    bundle.disposeActor?.();
    bundle.actorHolder.clear();

    const built = buildBlockyArcadeFootballer3D(previewPlayer);
    bundle.actorHolder.add(built.root);
    bundle.rig = built.rig;
    bundle.disposeActor = built.dispose;
  }, [previewPlayer]);

  const country = COUNTRIES[previewPlayer.nationality] ?? COUNTRIES.BRA;
  const tryoutCountry =
    TRYOUT_LEAGUE_COUNTRIES[previewPlayer.startingLeagueCountry] ?? TRYOUT_LEAGUE_COUNTRIES.BRA;
  const natTeam = getNationalTeamByCountry(previewPlayer.nationality);
  const macros = computeFifaMacroStats(previewPlayer.attributes);

  return (
    <div className="console-tile border-t-[3px] border-t-[#C8A45D] flex flex-col justify-between h-full relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-22"
        style={{
          background: `radial-gradient(circle at 50% 42%, ${natTeam.primaryColor}88, transparent 68%)`,
        }}
      />

      <div className="px-5 pt-4 pb-3 border-b border-[#242730] flex items-center justify-between relative z-10 shrink-0">
        <div className="flex items-center gap-3.5">
          <div
            className="font-condensed font-extrabold text-5xl leading-none"
            style={{ color: getFifaStatColor(previewPlayer.overall) }}
          >
            {previewPlayer.overall}
          </div>
          <div>
            <div className="font-condensed uppercase font-extrabold text-xl text-[#F5F5F7] leading-none">
              {previewPlayer.position} • #{previewPlayer.shirtNumber} • {previewPlayer.age} ANOS
            </div>
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-[#9498A3] mt-1">
              <CountryFlag code={previewPlayer.nationality} size="sm" />
              <span>{country.name}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] uppercase tracking-widest text-[#565A65] block">
              PAÍS DE INÍCIO
            </span>
            <span className="inline-flex items-center gap-1.5 font-condensed uppercase font-bold text-xs text-[#C8A45D]">
              <CountryFlag code={tryoutCountry.code} size="xs" />
              {tryoutCountry.name}
            </span>
          </div>
          <ClubCrest clubId={natTeam.id} size="md" />
        </div>
      </div>

      <div className="flex-1 relative min-h-0">
        <div
          ref={canvasHostRef}
          className="absolute inset-0 cursor-grab active:cursor-grabbing"
        />

        <div className="absolute bottom-3 inset-x-4 flex items-center justify-between pointer-events-none z-10">
          <span className="text-[10px] uppercase tracking-widest text-[#9498A3] bg-[#0B0B0D]/80 px-2.5 py-1 border border-[#242730] inline-flex items-center gap-1.5">
            <GamepadBadge action="RS" />
            <span>GIRAR</span>
          </span>

          <div className="flex gap-1.5 pointer-events-auto">
            <button
              type="button"
              data-nav-ignore="true"
              onClick={() => setCelebrating((c) => !c)}
              className={`px-2.5 py-1 border font-condensed uppercase font-bold text-[11px] tracking-wider cursor-pointer ${
                celebrating
                  ? 'bg-[#C8A45D] text-[#0B0B0D] border-[#C8A45D]'
                  : 'bg-[#0B0B0D]/90 text-[#F5F5F7] border-[#242730] hover:border-[#C8A45D]'
              }`}
            >
              {celebrating ? 'EM PÉ' : 'COMEMORAR'}
            </button>

            <button
              type="button"
              data-nav-ignore="true"
              data-pad-lt="true"
              onClick={() => {
                targetYawRef.current += Math.PI;
              }}
              className="px-2.5 py-1 bg-[#0B0B0D]/90 border border-[#242730] hover:border-[#C8A45D] font-condensed uppercase font-bold text-[11px] tracking-wider text-[#F5F5F7] cursor-pointer"
            >
              FRENTE / COSTAS
            </button>

            <button
              type="button"
              data-nav-ignore="true"
              data-pad-rt="true"
              onClick={() =>
                setZoomFaceOverride((curr) =>
                  curr === null ? activePreset !== 'HEAD_CLOSEUP' : !curr,
                )
              }
              className="px-2.5 py-1 bg-[#0B0B0D]/90 border border-[#242730] hover:border-[#C8A45D] font-condensed uppercase font-bold text-[11px] tracking-wider text-[#C8A45D] cursor-pointer"
            >
              {activePreset === 'HEAD_CLOSEUP' ? 'CORPO' : 'ROSTO'}
            </button>
          </div>
        </div>
      </div>

      <div className="px-5 py-3 border-t border-[#242730] bg-[#0E0F12]/90 grid grid-cols-6 gap-2 text-center relative z-10 shrink-0">
        {(
          [
            ['RIT', macros.ritmo],
            ['FIN', macros.finalizacao],
            ['PAS', macros.passe],
            ['DRI', macros.drible],
            ['DEF', macros.defesa],
            ['FIS', macros.fisico],
          ] as [string, number][]
        ).map(([lbl, val]) => (
          <div key={lbl}>
            <div
              className="font-condensed font-extrabold text-xl leading-none tabular-nums"
              style={{ color: getFifaStatColor(val) }}
            >
              {val}
            </div>
            <div className="text-[10px] uppercase tracking-widest text-[#9498A3] mt-0.5">
              {lbl}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
