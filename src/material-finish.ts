import * as THREE from 'three';

export type Finish = 'fabric' | 'skin' | 'leather' | 'metal' | 'paint';
/** Keep material intent separate from colour: a navy jacket is not blue car paint. */
export function finishMaterial(color: number, finish: Finish, weave?: THREE.Texture): THREE.MeshStandardMaterial {
  let material: THREE.MeshStandardMaterial;
  if (finish === 'paint') {
    material = new THREE.MeshPhysicalMaterial({color, metalness: .45, roughness: .26, clearcoat: .8, clearcoatRoughness: .18});
  } else {
    material = new THREE.MeshStandardMaterial({color,
      roughness: finish === 'skin' ? .58 : finish === 'fabric' ? .94 : finish === 'leather' ? .64 : .3,
      metalness: finish === 'metal' ? .85 : 0,
    });
  }
  if (finish === 'fabric' && weave) {
    material.bumpMap = weave; material.bumpScale = .009;
    material.roughnessMap = weave;
  }
  material.name = `finish:${finish}`;
  return material;
}

export function fabricWeave() {
  const size = 64, data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const value = 210 + ((x + y) % 2 ? 30 : 0) + (x % 4 === 0 ? 10 : 0);
    const i = (y * size + x) * 4;
    data.set([value, value, value, 255], i);
  }
  const texture = new THREE.DataTexture(data, size, size);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3); texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter; texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

/** Soft radial sprites replace square impact/smoke points without expanding the particle pool. */
export function particleSprite() {
  const size = 64, data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const r = Math.hypot((x + .5) / size * 2 - 1, (y + .5) / size * 2 - 1);
    const alpha = Math.pow(Math.max(0, 1 - r * r), 2);
    data.set([255, 255, 255, Math.round(alpha * 255)], (y * size + x) * 4);
  }
  const texture = new THREE.DataTexture(data, size, size);
  texture.magFilter = texture.minFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

/** Own a compact indoor light rig per room; no global scene traversal or material mutation. */
export function interiorLighting(scene: THREE.Scene, accent: number) {
  const fill = new THREE.HemisphereLight(0xb8cde4, 0x5c493a, 1.05);
  const key = new THREE.DirectionalLight(0xffd5a2, 2.4);
  key.name = 'interior-window-key'; key.position.set(-4, 7, 5); key.target.position.set(0, 0, -2);
  key.castShadow = true; key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, {left: -11, right: 11, top: 11, bottom: -11, near: .5, far: 30});
  key.shadow.camera.updateProjectionMatrix();
  key.shadow.normalBias = .025; key.shadow.bias = -.00015;
  const lamps = [-5, 5].map(x => {const l = new THREE.PointLight(accent, 18, 15, 2); l.position.set(x, 3, -1); return l;});
  scene.add(fill, key, key.target, ...lamps);
  return () => {scene.remove(fill, key, key.target, ...lamps); key.shadow.map?.dispose(); key.shadow.mapPass?.dispose();};
}
