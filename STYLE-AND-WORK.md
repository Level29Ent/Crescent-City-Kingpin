# Live character, jobs and customization

## Live avatar

Character selection now has a persistent rotatable 3D preview. Gender presentation, skin, outfit, hair color, hairstyle, accessory and facial hair update the model immediately without leaving the selection screen. Drag to rotate; each change also updates the outdoor/current-interior avatar and autosaves. Identity/heritage remains descriptive and has no race-based stat differences. Added eyes, pupils, brows, nose, ears, mouth and clothing trim improve close-up readability while keeping the original stylized procedural avatar and rig.

New cosmetic controls: Classic/Curls/Mohawk/Tied-back hairstyle, None/Sunglasses/Cap/Fedora, and clean-shaven/short beard. Older saves get valid defaults. Preview uses one WebGL context and disposes replaced avatars; it stops when the tab/panel closes, with no permanent animation loop. On unsupported WebGL it shows an unavailable message rather than breaking controls.

## Earn more through active work

Empire → Jobs & Style offers four repeatable, spatial timed work orders:

- Po-boy Catering Run: collect at HQ, deliver to (0,60), $220 clean.
- Warehouse Salvage: collect at (60,120), deliver to the chop shop (-60,0), $350 clean + two parts.
- Jazz Club Equipment Courier: lounge (0,-60) to Marigny (60,-60), $280 clean.
- Missing Art Crate: cemetery edge (180,0) to Uptown fence (-120,60), $850 dirty +8 heat.

Complete/skip onboarding first. Accept, travel to pickup and E, then travel to drop-off and E. No instant payout on accepting, viewing or standing. Only one work order; 45s cooldown after completion, 30s after expiration/abandon. Progress saves with the campaign; its timer resumes after offline/interior pause. Jobs cannot start alongside side-story/daily objectives. A failed/abandoned job pays nothing. Existing missions, turf, heists, pickups and daily challenges remain available.

## Businesses and buildings

Five new purchasable properties: Tremé Barbershop, Frenchmen Vinyl & Records, Crescent Seafood Market, Canal Picture House (laundering front) and Bywater Courier Depot. All have explicit clean purchase costs/daily upkeep. Revenue rackets require a paid, loyal crew; owning a public room alone generates nothing. Existing property simulation/offline/heat/raid rules apply. Five matching furnished public interiors bring Buildings to 17. These use existing themed rooms and entrance transitions within the current map rather than new streamed neighborhoods or bespoke exterior architecture.

## Safehouse

Jobs & Style has three HQ palettes, three light colors and $100 each patterned rug/framed city art. Re-enter Mama Nola's to see the selected design. Existing placed tactical furniture from Interior now appears in the walkable HQ at its corresponding room slot: security monitor, money vault, weapon locker and poker table. Existing bonuses remain; new palettes/decor are cosmetic only. The room preview remains the actual enterable room, not a new live safehouse editor.

## Cars

Jobs & Style provides per-bay spoiler and racing stripes ($200 each, once per vehicle), with 3D previews. Existing paid underglow/rim upgrades gain selectable violet/cyan/amber lighting and gold/chrome/black rims. Body styling previews show spoiler/stripe changes; underglow/rim accents apply on next deployment with the existing upgrades, as do matte materials. Vehicle geometry is stylized and styling is generic, not brand-specific body kits. No cosmetic purchase changes armor/speed or creates income. Existing garage eight-bay limit, engine/nitro/armor mechanics and paint remain.

## Control fixes

Look sensitivity 0.4–2× and invert-Y apply to mouse and touch. When touch mode is enabled, dragging the canvas with a mouse looks around without firing; action buttons still fire. Right-button dragging also looks/aims without requiring pointer lock. Release/blur clears drag state. Interact/reload key-repeat protection prevents repeated UI/door activation. Existing keyboard/joystick movement, touch hold actions, deadzones and HUD lanes remain.

## Save/testing

New lifestyle state validates/migrates defaults and persists with localStorage/IndexedDB/export codes. Tests cover active work progression, one-time payout, timeout, resource rewards, once-only paid styling, avatar geometry, business gates and migration. Run npm test, npm run typecheck and npm run build. Full work delivery, every interior, deployed vehicle styling and physical multi-touch need end-to-end playtesting; see PR verification for browser checks. No backend or infrastructure changes.
