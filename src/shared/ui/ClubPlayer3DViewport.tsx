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
  /** 'HERO' = corpo inteiro grande p/ Menu Principal | 'BUST' = enquadramento da cintura p/ cima no card da Central */
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
  const targetYawRef = useRef(framing === 'HERO' ? -0.28 : -0.22);
  const currentYawRef = useRef(framing === 'HERO' ? -0.28 : -0.22);

  const bundleRef = useRef<{
    actorHolder: THREE.Group;
    rig: AnimatedRigHandles | null;
    rimLight: THREE.DirectionalLight;
    disposeActor?: () => void;
  } | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(framing === 'BUST' ? 28 : 31, 1, 0.1, 25);
    const hRatio = player.heightCm / 178;

    if (framing === 'BUST') {
      camera.position.set(0, 1.18 * hRatio, 2.08);
      camera.lookAt(0, 1.08 * hRatio, 0);
    } else {
      camera.position.set(0, 0.96, 2.95);
      camera.lookAt(0, 0.83, 0);
    }

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.14;
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
    bundleRef.current = { actorHolder, rig: null, rimLight };

    const syncSize = () => {
      const w = Math.max(120, host.clientWidth);
      const h = Math.max(120, host.clientHeight);
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

      if (!dragging) {
        // Oscilação sutil de vitrine de estádio
        const idleSwing = (framing === 'HERO' ? -0.28 : -0.22) + Math.sin(t * 0.6) * 0.14;
        if (!allowDragSpin) {
          targetYawRef.current = idleSwing;
        }
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
  }, [allowDragSpin, framing, player.heightCm]);

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
      // Esconde o pedestal no modo busto para flutuar limpo dentro do card Meu Pro!
      built.root.children.forEach((child) => {
        if (child !== built.rig.character) {
          child.visible = false;
        }
      });
    }
    bundle.actorHolder.add(built.root);
    bundle.rig = built.rig;
    bundle.disposeActor = built.dispose;
  }, [player, club, framing]);

  return (
    <div
      ref={hostRef}
      className={`relative overflow-hidden ${allowDragSpin ? 'cursor-grab active:cursor-grabbing' : ''} ${className}`}
    />
  );
};
