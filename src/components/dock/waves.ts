// One wave function, two implementations: GLSL for the ocean surface and JS so
// floating objects can ride the exact same crests.

export interface Wave {
  dirX: number
  dirZ: number
  amp: number
  freq: number
  speed: number
}

export const WAVES: readonly Wave[] = [
  { dirX: 1, dirZ: 0.2, amp: 0.32, freq: 0.32, speed: 0.9 },
  { dirX: -0.4, dirZ: 1, amp: 0.18, freq: 0.55, speed: 1.3 },
  { dirX: 0.7, dirZ: -0.7, amp: 0.08, freq: 1.2, speed: 1.9 },
]

/** Height of the sea surface at (x, z) and time t (seconds). */
export function waveHeight(
  x: number,
  z: number,
  t: number,
  waves: readonly Wave[] = WAVES,
): number {
  let h = 0
  for (const w of waves) {
    const len = Math.hypot(w.dirX, w.dirZ) || 1
    const d = (w.dirX / len) * x + (w.dirZ / len) * z
    h += w.amp * Math.sin(d * w.freq + t * w.speed)
  }
  return h
}

function glslFloat(n: number): string {
  return Number.isInteger(n) ? `${n}.0` : String(n)
}

const glslWaveTerms = WAVES.map((w) => {
  const len = Math.hypot(w.dirX, w.dirZ) || 1
  const dx = glslFloat(+(w.dirX / len).toFixed(5))
  const dz = glslFloat(+(w.dirZ / len).toFixed(5))
  return `  h += ${glslFloat(w.amp)} * sin(dot(p, vec2(${dx}, ${dz})) * ${glslFloat(w.freq)} + t * ${glslFloat(w.speed)});`
}).join('\n')

export const OCEAN_VERTEX = /* glsl */ `
uniform float uTime;
varying float vHeight;
varying vec3 vWorld;
#include <fog_pars_vertex>

float waveHeight(vec2 p, float t) {
  float h = 0.0;
${glslWaveTerms}
  return h;
}

void main() {
  vec3 pos = position;
  // Plane is rotated -90deg on X in the scene, so local (x, -y) maps to world (x, z).
  float h = waveHeight(vec2(pos.x, -pos.y), uTime);
  pos.z += h;
  vHeight = h;
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  vWorld = (modelMatrix * vec4(pos, 1.0)).xyz;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`

export const OCEAN_FRAGMENT = /* glsl */ `
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uFoam;
uniform vec3 uInk;
varying float vHeight;
varying vec3 vWorld;
#include <fog_pars_fragment>

void main() {
  // Cel-shaded water: hard colour bands instead of a smooth gradient (anime look).
  float k = smoothstep(-0.45, 0.5, vHeight);
  float band = floor(k * 4.0) / 3.0;
  vec3 col = mix(uDeep, uShallow, band);
  // Crest foam with an ink line underneath, broken up by a cheap stripe pattern.
  float stripes = 0.5 + 0.5 * sin(vWorld.x * 3.1 + vWorld.z * 2.3);
  float crest = vHeight + stripes * 0.07;
  float foam = step(0.44, crest);
  float ink = step(0.39, crest) * (1.0 - foam);
  col = mix(col, uInk, ink * 0.55);
  col = mix(col, uFoam, foam * 0.9);
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`
