# Story, street life, combat and discovery expansion

## 1. Connected story arc

Open **Empire → Stories & Exploration** after completing or explicitly skipping the existing tutorial. Three chapters unlock in order:

1. **The Brass Ledger** — Mama Nola asks you to recover musicians' stolen pay records from the Violet Crown.
2. **Midnight on the Levee** — Captain June exposes a relief-supply racket at the port.
3. **A Crown of Broken Promises** — face Delphine Moreau's boss encounter at the old station.

Each chapter starts with written dialogue and a quiet/high-risk choice. Track the contact, physically reach it and press **E / INTERACT**. Defeat the boss/lieutenant and guards, then bring evidence back to Mama Nola. Quiet resolutions improve crew loyalty and generate less heat; bold choices add 35% payout and more heat. Rewards cannot be claimed twice. The final chapter unlocks the **Crescent Revolver** for purchase in Armory ($12,000 clean, six-round magazine, strong single-shot damage). It uses the existing pistol silhouette with different weapon stats, not a new imported firearm model.

Story objectives, choices, completions and surviving tagged enemies are saved with the campaign. Active side missions/daily routes and story starts are mutually gated to keep one objective tracker authoritative. Existing player saves get an empty story record without losing any inventory or money. These are short connected contact/combat/return missions, not voiced cutscenes or cinematic branching dialogue trees.

## 2. Living streets

Six bounded NPC traffic vehicles patrol street segments, including a taxi. Two police cruisers activate at heat 40+, travel the connected street grid and choose turns at intersections toward the player. Civilian traffic brakes near the player; close cruiser/vehicle encounters can hurt or slow the player and shake the camera. Existing wandering pedestrians now react when close to traffic; all existing civilian panic, sirens, police foot patrols and weather visibility rules remain.

Traffic is deliberately capped at eight vehicles and pauses with outdoor gameplay. It starts only after onboarding. It is a lightweight lane/intersection simulation: no traffic lights, citywide navigation mesh, vehicle-to-vehicle avoidance, persistent NPC identities or fully physical crash solver. Cruisers do not drive through new streamed districts; they use the existing grid.

## 3. Combat

**C / COVER** toggles crouch. Crouching slows walking and tightens spread. Crouch within 2.4 m of one of the visible waist-high sandbag/cover stations to reduce incoming damage by 60%; standing nearby alone grants no reduction. The HUD explicitly distinguishes CROUCHED from COVERED. Cover stations block movement, but do not introduce a separate ballistic destruction system. Rival enemies alternate direct approach with short left/right flank bursts; bosses retain higher health/faster firing, and the story objective shows remaining crew and lead health.

Stations are at Rampart (0,-115), port (120,175), old station (-180,6) and Frenchmen (60,6). Keyboard, analog joystick and touch cover controls coexist. Tutorial hides the extra cover action until core shooting/driving is taught. Existing ammo, reload, headshots, armor, recoil and upgrade systems remain; no explosive weapon was added.

## 4. Exploration

Four new named exploration subareas within the current city grid—not a larger world boundary:

- **Old Tremé Station / rail quarter**: waiting-room interior and a one-time +4 parts cache.
- **Bywater Mural Walk / arts corridor**: artists' studio interior, colored landmark panels and $450 dirty cache.
- **Cemetery Edge Archive**: record-room interior and $300 dirty cache.
- **Canal Street Newsroom**: furnished newsroom interior and $350 dirty cache.

Gold beacons mark undiscovered caches. Reach the location and E once to discover/claim, then E again to enter the public room. Cyan entrance rings and the Buildings directory include the four additional rooms (12 total). Rooms reuse themed furniture styles rather than new bespoke art assets. Entry is free and does not grant ownership/income. Track any landmark from Stories & Exploration. Discovery flags persist across save/export/import and never pay simply for standing still.

## Verification

`npm test`, `npm run typecheck`, `npm run build`. Added deterministic tests for chapter sequencing, spatial objectives, single reward claims, quiet/bold outcomes, finale unlock, save migration/discoveries, cover eligibility, flanking phases and traffic stepping. Browser testing covers only the flows listed in the PR; full boss fights, long pursuit tuning and physical multitouch need additional playtesting. No infrastructure changes or new external services. Existing shared leaderboard database requirement is unchanged.
