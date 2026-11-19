import * as THREE from 'three';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

/** Original, deterministic surface art. No image downloads or runtime asset requests. */
export function surfaceTexture(kind: 'street' | 'plaster') {
  const size = 256, data = new Uint8Array(size * size * 4);
  let seed = kind === 'street' ? 2981 : 733;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const grain = random(), fleck = random();
    const wave = Math.sin(x * Math.PI / 32) * Math.sin(y * Math.PI / 64);
    const value = kind === 'street'
      ? 205 + grain * 36 + wave * 8 - (fleck < .025 ? 55 : 0)
      : 220 + grain * 24 + wave * 6 - (fleck < .012 ? 35 : 0);
    const i = (y * size + x) * 4;
    data[i] = data[i + 1] = data[i + 2] = Math.round(value); data[i + 3] = 255;
  }
  const texture = new THREE.DataTexture(data, size, size);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

/** Planar UVs for the existing merged geometry, scaled in world metres, not per building. */
export function surfaceUVs(positions: number[], normals: number[], metres = 4) {
  const uv = new Float32Array(positions.length / 3 * 2);
  for (let i = 0, j = 0; i < positions.length; i += 3, j += 2) {
    const nx = Math.abs(normals[i]!), ny = Math.abs(normals[i + 1]!), nz = Math.abs(normals[i + 2]!);
    uv[j] = (nx > ny && nx > nz ? positions[i + 2]! : positions[i]!) / metres;
    uv[j + 1] = (ny >= nx && ny >= nz ? positions[i + 2]! : positions[i + 1]!) / metres;
  }
  return uv;
}

/** A small prefiltered sky supplies broad, physically based reflections to paint and wet stone. */
export function createSkyEnvironment(renderer: THREE.WebGLRenderer, scene: THREE.Scene) {
  const source = new THREE.Scene();
  const geometry = new THREE.SphereGeometry(10, 32, 16);
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    vertexShader: 'varying vec3 vSky; void main(){vSky=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `varying vec3 vSky;
      void main(){
        vec3 d=normalize(vSky);
        vec3 sky=mix(vec3(.65,.34,.20),vec3(.16,.32,.55),smoothstep(-.05,.7,d.y));
        sky=mix(vec3(.075,.065,.06),sky,smoothstep(-.4,.05,d.y));
        float sun=pow(max(0.,dot(d,normalize(vec3(-.5,.55,.6)))),96.);
        gl_FragColor=vec4(sky+vec3(5.,3.4,1.8)*sun,1.);
      }`,
  });
  source.add(new THREE.Mesh(geometry, material));
  const generator = new THREE.PMREMGenerator(renderer);
  const target = generator.fromScene(source, .04, .1, 30);
  const previous = scene.environment;
  scene.environment = target.texture;
  geometry.dispose(); material.dispose(); generator.dispose();
  return () => { scene.environment = previous; target.dispose(); };
}

/** Linear-light grade before OutputPass; never grades the HTML HUD or blurs gameplay. */
export function createFilmGrade() {
  return new ShaderPass({
    uniforms: { tDiffuse: { value: null } },
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv;
      void main(){
        vec4 source=texture2D(tDiffuse,vUv); vec3 c=source.rgb;
        float l=dot(c,vec3(.2126,.7152,.0722));
        float shadows=1.-smoothstep(.015,.5,l);
        c*=mix(vec3(1.025,1.005,.97),vec3(.93,1.015,1.055),shadows*.45);
        c=mix(vec3(l),c,1.045);
        vec2 p=vUv*(1.-vUv);
        float vignette=smoothstep(0.,.22,p.x*p.y*4.);
        gl_FragColor=vec4(max(c,0.)*mix(.89,1.,vignette),source.a);
      }`,
  });
}
