import * as THREE from 'three';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { getNationalTeamByCountry } from '../../data/clubs';
import { CareerPlayer } from '../../domains/player/playerTypes';
import {
  createTintedSkinTexture,
  createUvJerseyTexture,
} from './kitTextureGenerator';

interface CachedAssets {
  athleteGltf: GLTF;
  idleClip: THREE.AnimationClip | null;
}

let assetPromise: Promise<CachedAssets> | null = null;

export function preloadHumanAthleteAssets(): Promise<CachedAssets> {
  if (!assetPromise) {
    const loader = new GLTFLoader();
    assetPromise = Promise.all([
      loader.loadAsync('/models/pro_athlete.glb'),
      loader.loadAsync('/models/pro_idle.glb').catch(() => null),
    ]).then(([athleteGltf, idleGltf]) => {
      let idleClip: THREE.AnimationClip | null = null;
      if (idleGltf && idleGltf.animations[0]) {
        const raw = idleGltf.animations[0];
        // Mantém apenas rotações quaternion para os pés ficarem cravados no gramado sem pulo de escala!
        const safeTracks = raw.tracks.filter((t) => t.name.endsWith('.quaternion'));
        idleClip = new THREE.AnimationClip('ProStandingIdle', raw.duration, safeTracks);
      }
      return { athleteGltf, idleClip };
    });
  }
  return assetPromise;
}

function applyBodyKitShader(
  mat: THREE.MeshStandardMaterial,
  sockTopY: number,
  kitPrimaryHex: string,
  kitSecondaryHex: string,
  sleeveStyle: CareerPlayer['appearance']['sleeveStyle'],
  accessory: CareerPlayer['appearance']['accessory'],
): void {
  const cSock = new THREE.Color(kitPrimaryHex);
  const cStripe = new THREE.Color(kitSecondaryHex);
  const cThermal = new THREE.Color('#101217');
  const cWhite = new THREE.Color('#F5F5F7');

  const sleeveMode = sleeveStyle === 'LONGA' ? 1 : sleeveStyle === 'TERMICA' ? 2 : 0;
  const hasWrist = accessory === 'MUNHEQUEIRA' ? 1 : 0;
  const hasGloves = accessory === 'LUVAS' ? 1 : 0;
  const hasAnkle = accessory === 'TORNOZELEIRA' ? 1 : 0;

  mat.customProgramCacheKey = () =>
    `pro_body_${sockTopY}_${sleeveMode}_${hasWrist}_${hasGloves}_${hasAnkle}`;

  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uSockTop = { value: sockTopY };
    shader.uniforms.uSockCol = { value: cSock };
    shader.uniforms.uStripeCol = { value: cStripe };
    shader.uniforms.uThermalCol = { value: cThermal };
    shader.uniforms.uWhiteCol = { value: cWhite };
    shader.uniforms.uSleeveMode = { value: sleeveMode };
    shader.uniforms.uHasWrist = { value: hasWrist };
    shader.uniforms.uHasGloves = { value: hasGloves };
    shader.uniforms.uHasAnkle = { value: hasAnkle };

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying vec3 vRestPos;',
      )
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvRestPos = position;',
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vRestPos;
        uniform float uSockTop;
        uniform vec3 uSockCol;
        uniform vec3 uStripeCol;
        uniform vec3 uThermalCol;
        uniform vec3 uWhiteCol;
        uniform int uSleeveMode;
        uniform int uHasWrist;
        uniform int uHasGloves;
        uniform int uHasAnkle;`,
      )
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        // Meião de Futebol esculpido direto na panturrilha humana real
        if (vRestPos.y < uSockTop) {
          float stripeBand = step(uSockTop - 0.032, vRestPos.y);
          vec3 sCol = mix(uSockCol, uStripeCol, stripeBand);
          if (uHasAnkle == 1 && vRestPos.y < 0.21) {
            sCol = uWhiteCol;
          }
          diffuseColor.rgb = sCol;
        }
        // Mangas Longas / Térmica / Munhequeira / Luvas nos braços esculpidos (T-pose rest x)
        float absX = abs(vRestPos.x);
        if (vRestPos.y > 1.15 && absX > 0.27) {
          if (uSleeveMode == 1 && absX < 0.455) {
            diffuseColor.rgb = uSockCol;
          } else if (uSleeveMode == 2 && absX < 0.455) {
            diffuseColor.rgb = uThermalCol;
          }
          if (uHasWrist == 1 && absX >= 0.435 && absX <= 0.468) {
            diffuseColor.rgb = uWhiteCol;
          }
          if (uHasGloves == 1 && absX > 0.468) {
            diffuseColor.rgb = uThermalCol;
          }
        }`,
      );
  };
}

export async function buildRealisticHumanFootballer3D(player: CareerPlayer): Promise<{
  root: THREE.Group;
  mixer: THREE.AnimationMixer | null;
  dispose: () => void;
}> {
  const { athleteGltf, idleClip } = await preloadHumanAthleteAssets();
  const root = new THREE.Group();
  const disposableTextures: THREE.Texture[] = [];
  const disposableMaterials: THREE.Material[] = [];

  // Pedestal escuro elegante de vestiário/campo
  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(0.54, 0.58, 0.04, 48),
    new THREE.MeshStandardMaterial({ color: '#0F1116', roughness: 0.45, metalness: 0.25 }),
  );
  pedestal.position.y = -0.02;
  root.add(pedestal);

  const turf = new THREE.Mesh(
    new THREE.CylinderGeometry(0.50, 0.50, 0.012, 48),
    new THREE.MeshStandardMaterial({ color: '#143522', roughness: 0.88 }),
  );
  turf.position.y = 0.004;
  root.add(turf);

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.485, 0.505, 56),
    new THREE.MeshBasicMaterial({ color: '#C8A45D', side: THREE.DoubleSide }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.011;
  root.add(ring);

  // Clona o humano esculpido preservando todo o esqueleto (SkinnedMesh)
  const avatarClone = cloneSkeleton(athleteGltf.scene) as THREE.Group;
  const hScale = player.heightCm / 178;
  const wScale = 0.92 + ((player.weightKg - 60) / 32) * 0.16;
  avatarClone.scale.set(wScale, hScale, wScale);
  root.add(avatarClone);

  const natTeam = getNationalTeamByCountry(player.nationality);
  const kitPrimary = natTeam.primaryColor || '#16181D';
  const kitSecondary = natTeam.secondaryColor || '#C8A45D';
  const shortsHex =
    kitSecondary.toUpperCase() === kitPrimary.toUpperCase() ? '#111318' : kitSecondary;

  const { appearance } = player;
  const sockTopY =
    appearance.sockHeight === 'ALTO' ? 0.51 : appearance.sockHeight === 'BAIXO' ? 0.30 : 0.41;

  const jerseyTex = createUvJerseyTexture(
    natTeam.shortName,
    player.shirtName,
    player.shirtNumber,
    kitPrimary,
    kitSecondary,
  );
  disposableTextures.push(jerseyTex);

  avatarClone.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    const orig = node.material as THREE.MeshStandardMaterial;
    const matName = orig?.name ?? '';

    if (node.name === 'Wolf3D_Outfit_Top' || matName === 'Wolf3D_Outfit_Top') {
      const m = new THREE.MeshStandardMaterial({
        map: jerseyTex,
        normalMap: orig.normalMap,
        roughnessMap: orig.roughnessMap,
        roughness: 0.72,
        metalness: 0.04,
      });
      node.material = m;
      disposableMaterials.push(m);
    } else if (node.name === 'Wolf3D_Outfit_Bottom' || matName === 'Wolf3D_Outfit_Bottom') {
      const m = new THREE.MeshStandardMaterial({
        color: shortsHex,
        normalMap: orig.normalMap,
        roughnessMap: orig.roughnessMap,
        roughness: 0.75,
        metalness: 0.04,
      });
      node.material = m;
      disposableMaterials.push(m);
    } else if (node.name === 'Wolf3D_Outfit_Footwear' || matName === 'Wolf3D_Outfit_Footwear') {
      const m = new THREE.MeshStandardMaterial({
        color: appearance.bootColor || '#C8A45D',
        normalMap: orig.normalMap,
        roughnessMap: orig.roughnessMap,
        roughness: 0.38,
        metalness: 0.18,
      });
      node.material = m;
      disposableMaterials.push(m);
    } else if (node.name === 'Wolf3D_Hair' || matName === 'Wolf3D_Hair') {
      node.visible = appearance.hairStyle !== 'RASPADO';
      const m = new THREE.MeshStandardMaterial({
        color: appearance.hairColor || '#111827',
        normalMap: orig.normalMap,
        roughness: 0.76,
        metalness: 0.05,
      });
      node.material = m;
      disposableMaterials.push(m);
    } else if (matName === 'Wolf3D_Skin' || node.name === 'Wolf3D_Head') {
      const m = orig.clone();
      if (orig.map?.image) {
        const skinTex = createTintedSkinTexture(
          orig.map.image as CanvasImageSource,
          appearance.skinTone,
        );
        m.map = skinTex;
        disposableTextures.push(skinTex);
      }
      node.material = m;
      disposableMaterials.push(m);
    } else if (matName === 'Wolf3D_Body' || node.name === 'Wolf3D_Body') {
      const m = orig.clone();
      if (orig.map?.image) {
        const bodySkinTex = createTintedSkinTexture(
          orig.map.image as CanvasImageSource,
          appearance.skinTone,
        );
        m.map = bodySkinTex;
        disposableTextures.push(bodySkinTex);
      }
      applyBodyKitShader(
        m,
        sockTopY,
        kitPrimary,
        shortsHex,
        appearance.sleeveStyle,
        appearance.accessory,
      );
      node.material = m;
      disposableMaterials.push(m);
    }
  });

  let mixer: THREE.AnimationMixer | null = null;
  if (idleClip) {
    mixer = new THREE.AnimationMixer(avatarClone);
    const action = mixer.clipAction(idleClip);
    action.play();
  }

  return {
    root,
    mixer,
    dispose: () => {
      mixer?.stopAllAction();
      disposableTextures.forEach((t) => t.dispose());
      disposableMaterials.forEach((m) => m.dispose());
      pedestal.geometry.dispose();
      (pedestal.material as THREE.Material).dispose();
      turf.geometry.dispose();
      (turf.material as THREE.Material).dispose();
      ring.geometry.dispose();
      (ring.material as THREE.Material).dispose();
    },
  };
}
