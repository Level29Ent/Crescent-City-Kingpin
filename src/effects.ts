import * as THREE from "three";

// A fixed-size impact pool: sustained firefights never grow scene objects or buffers.
export function createImpacts(scene: THREE.Scene) {
  const count = 128;
  const positions = new Float32Array(count * 3).fill(-1000);
  const velocities = new Float32Array(count * 3);
  const life = new Float32Array(count);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  const material = new THREE.PointsMaterial({ color: 0xffcc77, size: 0.14, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  scene.add(points);
  let cursor = 0;
  return {
    burst(x: number, y: number, z: number) {
      for (let n = 0; n < 8; n++) {
        const i = cursor++ % count;
        positions.set([x, y, z], i * 3);
        velocities.set([(Math.random() - 0.5) * 5, Math.random() * 4, (Math.random() - 0.5) * 5], i * 3);
        life[i] = 0.25 + Math.random() * 0.2;
      }
    },
    update(dt: number) {
      for (let i = 0; i < count; i++) {
        if (life[i]! <= 0) continue;
        life[i]! -= dt;
        if (life[i]! <= 0) { positions[i * 3 + 1] = -1000; continue; }
        velocities[i * 3 + 1]! -= dt * 9;
        for (let j = 0; j < 3; j++) positions[i * 3 + j]! += velocities[i * 3 + j]! * dt;
      }
      geometry.attributes.position!.needsUpdate = true;
    },
  };
}
