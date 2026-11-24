import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { ClubData } from '../../data/clubs/types';
import { CareerPlayer } from '../../domains/player/playerTypes';
import {
  AnimatedRigHandles,
  buildBlockyArcadeFootballer3D,
} from '../three/player3DBuilder';

interface ClubPlayer3DViewportProps {
  player: CareerPlayer;
  club: ClubData;
  accentColor?: string;
  /** 'HERO' = corpo inteiro + pedestal p/ Menu Principal | 'BUST' = cintura p/ cima no card da Central */
  framing?: 'HERO' | 'BUST';
  allowDragSpin?: boolean;
  className?: string;
}

export const ClubPlayer3DViewport: React.FC<ClubPlayer3DViewportProps> = ({
  player,
  club,
  accentColor = '#C8A45D',
  framing = 'HERO',
  allowDragSpin = true,
  className = '',
}) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const targetYawRef = useRef(framing === 'HERO' ? -0.26 : -0.22);
  const currentYawRef = useRef(framing === 'HERO' ? -0.26 : -0.22);

  const bundleRef = useRef<{
    actorHolder: THREE.Group;
    rig: AnimatedRigHandles | null;
    rimLight: THREE.DirectionalLight;
    bounds: { minY: number; maxY: number; width: number; frontDepth: number };
    fitCamera: () => void;
    disposeActor?: () => void;
  } | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(framing === 'BUST' ? 28 : 30, 1, 0.1, 30);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.14;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    host.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight('#FFFFFF', '#1E293B', 1.32));
    const keyLight = new THREE.DirectionalLight('#FFFBEB', 1.85);
    keyLight.position.set(2.3, 3.8, 3.2);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(accentColor, 1.35);
    rimLight.position.set(-2.6, 2.4, -2.2);
    scene.add(rimLight);

    const actorHolder = new THREE.Group();
    scene.add(actorHolder);

    const fitCamera = () => {
      const w = Math.max(80, host.clientWidth);
      const h = Math.max(80, host.clientHeight);
      const aspect = w / h;
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);

      const b = bundleRef.current?.bounds ?? {
        minY: -0.06,
        maxY: 1.76,
        width: 1.36,
        frontDepth: 0.66,
      };

      const spanY = (b.maxY - b.minY) * (framing === 'HERO' ? 1.18 : 1.14);
      const spanX = b.width * (framing === 'HERO' ? 1.18 : 1.15);
      const centerY = (b.minY + b.maxY) * 0.5;

      const vFovRad = THREE.MathUtils.degToRad(camera.fov);
      const tanHalfV = Math.tan(vFovRad * 0.5);
      const tanHalfH = Math.max(0.08, tanHalfV * aspect);

      const distV = (spanY * 0.5) / tanHalfV + b.frontDepth;
      const distH = (spanX * 0.5) / tanHalfH + b.frontDepth * 0.7;
      const dist = Math.max(distV, distH);

      camera.position.set(0, centerY + (framing === 'HERO' ? 0.14 : 0.06), dist);
      camera.lookAt(0, centerY, 0);
    };

    bundleRef.current = {
      actorHolder,
      rig: null,
      rimLight,
      bounds: { minY: -0.06, maxY: 1.76, width: 1.36, frontDepth: 0.66 },
      fitCamera,
    };

    fitCamera();
    const ro = new ResizeObserver(fitCamera);
    ro.observe(host);

    let dragging = false;
    let prevX = 0;
    const onDown = (e: PointerEvent) => {
      if (!allowDragSpin) return;
      dragging = true;
      prevX = e.clientX;
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - prevX;
      prevX = e.clientX;
      targetYawRef.current += dx * 0.014;
    };
    const onUp = () => {
      dragging = false;
    };
    host.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);

    let rafId = 0;
    const animate = (nowMs: number) => {
      const t = nowMs * 0.001;
      const rig = bundleRef.current?.rig;
      if (rig) {
        const breath = Math.sin(t * 2.2);
        rig.character.position.y = breath * 0.007;
        rig.headPivot.rotation.y = Math.sin(t * 0.95) * 0.07;
        rig.headPivot.rotation.x = breath * 0.018;
        rig.leftArmPivot.rotation.z = -0.25 - breath * 0.018;
        rig.rightArmPivot.rotation.z = 0.25 + breath * 0.018;
        rig.leftForearmPivot.rotation.x = -0.28;
        rig.rightForearmPivot.rotation.x = -0.28;
      }

      if (!dragging && !allowDragSpin) {
        targetYawRef.current = (framing === 'HERO' ? -0.26 : -0.22) + Math.sin(t * 0.6) * 0.14;
      }

      currentYawRef.current += (targetYawRef.current - currentYawRef.current) * 0.1;
      actorHolder.rotation.y = currentYawRef.current;

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
      bundleRef.current?.disposeActor?.();
      bundleRef.current = null;
      renderer.dispose();
      if (renderer.domElement.parentNode === host) {
        host.removeChild(renderer.domElement);
      }
    };
  }, [allowDragSpin, framing]);

  useEffect(() => {
    const bundle = bundleRef.current;
    if (!bundle) return;
    bundle.rimLight.color.set(accentColor);
  }, [accentColor]);

  useEffect(() => {
    const bundle = bundleRef.current;
    if (!bundle) return;
    bundle.disposeActor?.();
    bundle.actorHolder.clear();

    const built = buildBlockyArcadeFootballer3D(player, club);
    if (framing === 'BUST') {
      built.root.children.forEach((child) => {
        if (child !== built.rig.character) {
          child.visible = false;
        }
      });
    }
    bundle.actorHolder.add(built.root);

    // Mede a caixa 3D real do atleta (altura + cabelo + pedestal) para NUNCA cortar cabeça ou pés!
    built.root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(
      framing === 'BUST' ? built.rig.character : built.root,
    );
    const size = new THREE.Vector3();
    box.getSize(size);
    const hScale = player.heightCm / 178;

    if (framing === 'BUST') {
      bundle.bounds = {
        minY: 0.72 * hScale,
        maxY: Math.max(1.62 * hScale, box.max.y + 0.04),
        width: Math.max(0.82, size.x),
        frontDepth: 0.25,
      };
    } else {
      bundle.bounds = {
        minY: Math.min(-0.06, box.min.y),
        maxY: Math.max(1.68 * hScale, box.max.y + 0.04),
        width: Math.max(1.34, size.x, size.z),
        frontDepth: 0.68,
      };
    }

    bundle.rig = built.rig;
    bundle.disposeActor = built.dispose;
    bundle.fitCamera();
  }, [player, club, framing]);

  return (
    <div
      ref={hostRef}
      className={`relative min-h-0 min-w-0 overflow-hidden ${allowDragSpin ? 'cursor-grab active:cursor-grabbing' : ''} ${className}`}
    />
  );
};
