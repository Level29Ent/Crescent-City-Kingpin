# Checkpoints, journal and deeper city play

Open **Empire / M → City Journal**. This extends the merged polish/replay and stabilization work. No new dependencies or external art/audio services.

## Reward-safe stage checkpoints
Supported original stories, Kingpin story/personal/takeover/protection ventures, City Life combat operations (protection/heist), and side missions record a checkpoint at each stage boundary. It contains only sanitized active-stage state, objective location and completion proof—not a nested campaign, balances, inventory, ownership, earned gear or defeated ordinary rivals.

After failing or respawning, use **Checkpoint / Journal → Retry last stage**. A retry:
- requires $50 clean, a clear checkpoint approach, no unrelated activity/defense/import contract/turf battle, and completion of the death animation;
- resumes the checkpoint on foot with full health/stamina and a reset encounter, without repeating earlier travel/stages;
- keeps current cash, cargo/items, equipment, property and story choices. Already-spent bribes/setup costs and death penalties are not refunded;
- never resurrects ordinary world rivals or restores their loot. Mission-marked guards no longer give per-kill cash; only their mission's final rewards apply;
- invalidates on successful completion, including repeatable side missions whose completion ID was already present. Explicit completion seals the checkpoint **before saving**, not only on the next frame;
- preserves bounded checkpoint state across save/load. Original $1,000 daily-route replay prevention and practice-save isolation remain.

Transport recovery/rescue, ordinary work and ambient events are deliberately not checkpointed because restoring their cars/passenger/cargo safely requires different semantics; restart them from their boards. A checkpoint can also be discarded. This is a paid stage retry, not a rewind/refund or arbitrary quicksave system. Practice clears inherited checkpoints and cannot retry/save campaign checkpoints.

## Enemy reactions
- An isolated gangster at 20 HP or below can surrender while directly targeted with close aim. They show a raised-hands pose and status prompt. Release aim/fire, approach within 3m and Interact to secure them without kill cash. Hurting them breaks surrender. Civilians, cops and bosses do not use this surrender rule.
- Isolated wounded gangsters retreat rather than always fighting to the death. Noises/last sightings produce short investigation windows; existing collision-aware routes and cover remain.
- Ordinary gangsters can call one backup after 3 seconds of visible engagement. A shared 30s cooldown and four-live-backup cap prevent per-frame spawning; mission guards never call extra squads. Existing separate police pursuit reinforcement rules remain.
- No surrender cash, hostage system, reputation-based dialogue tree or new navmesh is claimed. Mission guards count as resolved when secured nonlethally.

## Vehicle interiors and driving view
Four-wheel procedural vehicles have low-poly dashboard/seat trim by class, a steering wheel linked to steering input, moving speedometer needle and hinged driver/passenger door panels on entry/exit/boarding. Driver and passenger positions and existing visible seated poses remain. Cabin resources are owned/disposed per vehicle, and their extra meshes are hidden on street/parked cars farther than 35m away.

**V / Driver Camera** toggles a first-person driver-eye view; the camera follows turns while permitting limited look input. The player mesh hides in cockpit view. A toolbar button supports touch, and V can be remapped in Polish & Replays. Motorcycles retain chase view. Door panels animate, but the continuous generated body shell is not cut into physically enterable holes; no collision-based door injury or fully modeled licensed dashboards.

## City journal
The new board gathers:
- unresolved objectives and supported checkpoint/retry status;
- Mama Nola, Captain June, Delphine and hired specialists with saved loyalty/wage/personal-mission facts;
- original-story progression, protect/profit decisions, current consequence modifiers;
- discovered caches and neighborhood field notes with route buttons;
- a bounded recent log of checkpoint, retry, opening and decision events;
- guided-menu and cockpit preferences.

Facts come from the existing save state, not fabricated quest completion. Journal navigation/presentation does not grant cash.

## Earlier decisions affect later play
Protecting Harbor Compact relief routes changes the next chapter's initial contact to a dockworker-safe meeting. It also supplies a visible local guide/defender on later story/takeover stages. They assist only while the player is nearby, have finite stage health, can be injured by enemy shots and do not respawn at full health by reloading the same stage. This is stationary stage support, not a second fully controllable crew companion.

Selling routes and burying betrayal evidence add later guards; exposing the fixer reduces guards and slows eligible turf retaliation from 240s to 300s, while burying evidence accelerates it to 150s. Publishing the final ledger reduces late guard pressure further. Encounter counts remain bounded to 1–5. Docks greeting reactions reflect the harbor decision as well as ordinary trust. Existing three takeover endings remain based on the saved branch choices.

## Clearer opening
Guided menus initially show character, journal, tutorial, map/buildings, accessibility and settings. After the three teaching steps, essential work/garage/turf/crew/market/safehouse boards appear. Completing a clean work order or establishing other progression reveals all systems. Existing established campaigns keep all menus, and **Show all menus** or explicitly skipping the tutorial disables guidance at any time.

The HUD gives one next-step recommendation: meet Mama Nola → practice fight → marked-sedan delivery → first clean job → crew/corner. The original tutorial reward remains; it does not auto-buy property or dump new missions into the opening. This polishes the opening progression rather than claiming an hour of new voiced/cinematic content.

## Verification
New tests cover non-refunding checkpoints, stale/completed/other-activity gates, repeatable mission sealing across reload, deep stage copies, surrender/retreat/investigation/backup decisions, functional cabin motion/disposal, choice routes/guard counts/retaliation, journal actions, guided menus and persistent ally injury. Full tests, TypeScript, build and whitespace checks run before publication. Browser/mobile layout, cockpit visibility, actual enemy/chase balance, full checkpoint/replay flows and audio still require exact-head preview testing; the PR records its status.
