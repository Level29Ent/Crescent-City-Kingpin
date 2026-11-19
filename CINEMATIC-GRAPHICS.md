# Cinematic graphics

This is an Unreal-inspired lighting/material pass on the existing Three.js game, not an Unreal Engine port or a photorealistic asset replacement. The original city geometry, collision, camera, characters, missions and saves remain in place.

- Original, seeded 256px plaster/street textures with world-scaled planar UVs, mipmaps and bump detail on the existing merged scenery. No downloaded art or new dependencies.
- A prefiltered procedural sky environment adds broad reflections to the existing physically based materials, including vehicle paint. Its intensity follows the city day/night cycle. It is a static sky reflection, not a live mirror of nearby buildings or actors.
- Cooler ambient fill and a warmer sun give facades more separation. Outdoor rain lowers ground roughness; it does not simulate puddle depth or reflect the live scene.
- A subtle linear-light colour grade, restrained bloom and vignette run before the existing output transform. The HTML HUD stays crisp and unaffected. No depth-of-field blur or motion blur.
- **Graphics → Cinematic** enables half-resolution, 16-sample screen-space contact shadows as well as the existing 1.5x maximum render scale. Indoor and outdoor passes use the active scene.
- Balanced and Auto keep the film treatment without the extra contact-shadow geometry pass. Performance and a downscaled Auto mode retain the existing direct-render/no-bloom/no-shadows fallback. Surface detail and environment lighting remain available there.

Cinematic adds a normal/depth render and fullscreen passes: use Auto or Performance on slower GPUs. This change does not establish a frame-rate target on physical mobile hardware.

Checks: `npm test`, `npm run typecheck`, `npm run build`. The graphics tests cover deterministic texture data, UV projection and quality-mode gates; deployed visual checks are reported in the pull request.

## Whole-game pass

Cinematic is now the default for a new fine-pointer/desktop session. A saved graphics preference is never overwritten; coarse-pointer/mobile sessions still start in Auto. Pick another mode on the opening screen if needed.

The visual treatment now extends beyond the outdoor facades:

- All five procedural character kinds use distinct skin, woven fabric and leather finishes. Shared beveled torso/limb geometry and smoother heads soften silhouettes; NPCs now have facial landmarks too. Animation pivots, hit volumes and gameplay dimensions are unchanged.
- The procedural fleet (including motorcycles) uses clearcoat paint. Car bodies and roofs get shared beveled geometry. Procedural actor/vehicle parts now cast and receive the existing scene shadows when the quality budget allows shadows.
- Every enterable room uses a bounded 1024px directional shadow rig, cool ambient fill and warm/themed practical lights. Floors and walls get bump detail; finished floors are more reflective than warehouse floors. Main rooms and stockrooms borrow the shared prefiltered environment (never dispose it on exit).
- The river uses a physically based roughness/bump material with smooth normals recalculated at the existing quality-dependent wave interval. Reflections still sample the sky, not nearby moving objects.
- Impact sparks and tire smoke use soft radial particle textures instead of square point sprites. Both pools remain capped at 128 particles.
- FXAA runs after the output transform in the postprocessed modes, on both interior and exterior scenes; it follows physical render size on resize. The HTML HUD is not filtered. Performance/downscaled Auto continue bypassing the composer.

This remains a stylized procedural browser game. No claim of photorealistic characters, ray tracing, Unreal Engine rendering, live scene reflections, volumetric simulation or a sustained device frame rate is made. Cinematic costs more GPU work than Auto; beveled geometry/material updates are shared across modes. Tests cover actor/fleet material wiring, every interior's light/surface setup, resource cleanup, particle pool bounds and saved/default quality selection. Visual preview checks and remaining gaps are recorded on the PR.
