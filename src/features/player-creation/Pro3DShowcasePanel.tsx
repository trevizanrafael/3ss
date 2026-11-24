import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { getNationalTeamByCountry } from '../../data/clubs';
import { COUNTRIES, TRYOUT_LEAGUE_COUNTRIES } from '../../data/countries/countries';
import { CareerPlayer } from '../../domains/player/playerTypes';
import { computeFifaMacroStats } from '../../domains/training/trainingDrillsCatalog';
import { GamepadBadge } from '../../shared/gamepad/GamepadBadge';
import {
  buildRealisticHumanFootballer3D,
  preloadHumanAthleteAssets,
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
  const mountRef = useRef<HTMLDivElement | null>(null);
  const manualYawRef = useRef(0);
  const targetYawRef = useRef(-0.18);
  const [zoomFaceOverride, setZoomFaceOverride] = useState<boolean | null>(null);
  const [modelReady, setModelReady] = useState(false);

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
    preloadHumanAthleteAssets();
  }, []);

  useEffect(() => {
    setZoomFaceOverride(null);
    if (cameraPreset === 'FULL_BACK') {
      targetYawRef.current = Math.PI;
    } else if (cameraPreset === 'HEAD_CLOSEUP') {
      targetYawRef.current = 0.08;
    } else {
      targetYawRef.current = -0.18;
    }
  }, [cameraPreset]);

  const sceneBundleRef = useRef<{
    actorHolder: THREE.Group;
    mixer: THREE.AnimationMixer | null;
    disposeActor?: () => void;
  } | null>(null);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 30);
    camera.position.set(0, 1.05, 3.45);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    container.appendChild(renderer.domElement);

    // Iluminação equilibrada para pele humana realista
    scene.add(new THREE.HemisphereLight('#F8FAFC', '#1E2430', 1.25));
    const keyLight = new THREE.DirectionalLight('#FFFBF2', 1.65);
    keyLight.position.set(2.2, 3.2, 3.5);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight('#93C5FD', 0.85);
    rimLight.position.set(-2.5, 2.4, -2.5);
    scene.add(rimLight);

    const actorHolder = new THREE.Group();
    scene.add(actorHolder);
    sceneBundleRef.current = { actorHolder, mixer: null };

    const syncSize = () => {
      const w = Math.max(200, container.clientWidth);
      const h = Math.max(200, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    syncSize();
    const ro = new ResizeObserver(syncSize);
    ro.observe(container);

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
    container.addEventListener('pointerdown', onDown);
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
    const clock = new THREE.Clock();
    const lookCurrent = new THREE.Vector3(0, 0.95, 0);

    const animate = () => {
      const dt = Math.min(0.05, clock.getDelta());
      sceneBundleRef.current?.mixer?.update(dt);

      const p = presetRef.current;
      const hRatio = previewPlayer.heightCm / 178;
      const desiredCamPos =
        p === 'HEAD_CLOSEUP'
          ? new THREE.Vector3(0, 1.66 * hRatio, 0.95)
          : new THREE.Vector3(0, 1.02, 3.35);
      const desiredLook =
        p === 'HEAD_CLOSEUP'
          ? new THREE.Vector3(0, 1.64 * hRatio, 0)
          : new THREE.Vector3(0, 0.92, 0);

      camera.position.lerp(desiredCamPos, 0.09);
      lookCurrent.lerp(desiredLook, 0.09);
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
      container.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('gamepad-rs-move', onRsMove);
      sceneBundleRef.current?.disposeActor?.();
      renderer.dispose();
      container.innerHTML = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    buildRealisticHumanFootballer3D(previewPlayer).then((built) => {
      if (cancelled) {
        built.dispose();
        return;
      }
      const bundle = sceneBundleRef.current;
      if (!bundle) {
        built.dispose();
        return;
      }
      bundle.disposeActor?.();
      bundle.actorHolder.clear();
      bundle.actorHolder.add(built.root);
      bundle.mixer = built.mixer;
      bundle.disposeActor = built.dispose;
      setModelReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [previewPlayer]);

  const country = COUNTRIES[previewPlayer.nationality] ?? COUNTRIES.BRA;
  const tryoutCountry =
    TRYOUT_LEAGUE_COUNTRIES[previewPlayer.startingLeagueCountry] ?? TRYOUT_LEAGUE_COUNTRIES.BRA;
  const natTeam = getNationalTeamByCountry(previewPlayer.nationality);
  const macros = computeFifaMacroStats(previewPlayer.attributes);

  return (
    <div className="console-tile border-t-[3px] border-t-[#C8A45D] flex flex-col justify-between h-full relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
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

      <div className="flex-1 relative min-h-0 cursor-grab active:cursor-grabbing" ref={mountRef}>
        {!modelReady && (
          <div className="absolute inset-0 flex items-center justify-center font-condensed uppercase tracking-widest text-sm text-[#9498A3]">
            CARREGANDO ATLETA 3D...
          </div>
        )}

        <div className="absolute bottom-3 inset-x-4 flex items-center justify-between pointer-events-none z-10">
          <span className="text-[10px] uppercase tracking-widest text-[#9498A3] bg-[#0B0B0D]/80 px-2.5 py-1 border border-[#242730] inline-flex items-center gap-1.5">
            <GamepadBadge action="RS" />
            <span>GIRAR 360°</span>
          </span>

          <div className="flex gap-1.5 pointer-events-auto">
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
              {activePreset === 'HEAD_CLOSEUP' ? 'VER CORPO' : 'ZOOM ROSTO'}
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
