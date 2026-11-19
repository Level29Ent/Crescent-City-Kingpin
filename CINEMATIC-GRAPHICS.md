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
