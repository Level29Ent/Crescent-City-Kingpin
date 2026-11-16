# Gameplay polish, accessibility and safe replays

Open **Empire / M → Polish & Replays**. This builds on the merged stabilization patch and adds all six presentation/polish areas. No new dependencies, external artwork, user accounts or hosted services.

## Mission presentation
Original stories, side missions, City Life operations, work and Kingpin ventures now expose a contact card, locally illustrated portrait, dialogue and actual objective step/total. Cards can be dismissed and do not pause fights. They fade after a short outdoor interval. Completion/ended cards show **net activity-session changes** in clean cash, dirty cash, heat and aggregate crew loyalty; those may include ordinary simulation income/costs during the mission and are not represented as exact mission-only rewards. Existing completion records and explicit side-mission completion events distinguish success from abandonment/failure. Contact illustrations are procedural fictional portraits, not downloaded photos or voiced cinematics.

## Minimap
The north-up map draws street lines, building footprints, a cached advisory road-graph route, nearby businesses/doors, police cruisers/officers, enemies, a crew/rescue marker and the current destination. Shapes distinguish police triangles, business squares, hostile circles and destination/companion diamonds; a legend explains them. Only important destinations/crew clamp to the edge instead of crowding every off-map address into a ring. Police search is shown around the observed last-known position, not a hidden destination. The player arrow rotates with heading.

The dashed white line is an **advisory street route**, not full turn-by-turn player navigation. Endpoint connectors are shown only when collision-clear; it does not know about every moving vehicle or temporarily blocked road. Missing connectors do not claim the building can be crossed.

## Feedback
- Incoming hostile damage shows its direction relative to the camera when a source is known; generic collision damage does not invent an attacker.
- An interaction callout highlights the actual nearby prompt. The remapped Interact binding is shown on the action button.
- Vehicle condition has a persistent warning below 35%, plus one-shot crossing cues at 35%/15% rather than repeated sounds every frame.
- Briefing, success and failure have distinct procedural sound cues on the existing SFX/mute bus.

## Accessibility
Saved text size (100–150%), camera shake strength (including off), high-distinction map colors, action-key remapping and existing aim/look sensitivity are exposed together. Conflicting bindings swap instead of disabling another action; former unmapped physical keys do not also trigger old actions. Escape, arrows and weapon number keys remain fixed. Touch actions keep their meaning and display relevant keyboard bindings. OS reduced-motion preference still suppresses shake. These options do not change identity-based gameplay stats.

Text scaling targets HUD/menu text rather than scaling world geometry or the minimap canvas. Long cards remain scrollable and controls use responsive layout; actual device/browser verification is recorded in the PR, not inferred from CSS or tests.

## Neighborhood identity and field notes
Five existing reachable addresses have authored district signs and distinct crest silhouettes: Brass Walk, Heritage Trail, Magnolia Way, River Freight and Cypress Landing. Entering a district introduces its name and tagline. The board's local field guide links the existing jobs, venues and discoveries to each area.

At each landmark, explicitly press Interact to record a once-per-save **field note**. All five visits persist and are shown in the guide. Notes grant no cash, ownership or passive income. These are neighborhood landmarks and exploration interactions within the current city, not five rebuilt/expanded maps or new light-heavy environments.

## Real mission replay without duplicated progression
The board lists only completed original stories, side missions, City Life operations and Kingpin chapters. Choose normal completion, zero player gunshots or a 180-second challenge. Replays use the **actual mission logic**, not just a checkpoint tour.

Before practice begins, the original campaign and player snapshot must save to at least one existing storage copy. If neither copy can save, replay is cancelled. Practice then runs a deep disposable campaign copy. Sandbox mission costs/rewards, cargo, injuries, choices, unlocks and property changes are never written to the real campaign. The entire sandbox is discarded when returning via reload, closing the page, or abandoning practice. Original bounded offline business income may accrue while the saved campaign is away; that is not replay reward.

Autosave/manual save, export/import, retirement and progress reset are blocked during practice, including page-hide/unload save paths. Replay preparation has an input-blocking save screen; double launches are rejected. Active missions, defenses, import runs and daily routes must finish first. The practice banner and Exit Replay button remain visible. Death, mission completion/failure or abandonment displays elapsed time, player shot count and challenge verdict. Return to Saved Campaign reloads the pre-replay run. There are no persistent replay scores, extra rewards, leaderboard submissions or new unlocks from practice.

## Verification boundaries
Tests exercise deep replay isolation across every listed mission, mission completion proof, challenge results, write guards, remap conflicts/save migration, map projection/icons/routes, directional feedback math, portrait generation, UI actions, landmark geometry disposal and once-only field notes. Full suite/typecheck/build run before publication. Browser/mobile rendering, audio and full start-to-return replay flows still need an exact-head preview; current status is recorded in the PR.
