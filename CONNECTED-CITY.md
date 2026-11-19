# Connected city depth update

## Mission phone

Open **PHONE / P** while playing. The phone pauses the single-player simulation like the weapon selector. It shows the current objective, text messages/incoming contact notices, available contacts with GPS buttons, recent mission outcomes and neighborhood repair/witness reports. New available offers trigger a bounded notice and the existing contact cue. Selecting GPS only routes you; it never accepts a mission, spends money or grants rewards. Meet contacts at their physical address/desk to accept. History starts recording new activity outcomes after this update; old completion flags are not invented as historical calls. Messages/history/call IDs are bounded and saved. These are written messages, not recorded voice calls or multiplayer chat.

## Smarter combat

Existing cover reservations, peek timing, morale retreat, surrender, investigation and backup rules remain. Healthy gang squads now use deterministic anchor/left/right roles: an anchor holds and suppresses while eligible teammates alternate collision-validated flank destinations. Wounded/isolated enemies continue through the existing retreat/surrender gates; bosses retain their own telegraphed patterns. This is local squad behavior using the current pathfinder, not a new tactical/navmesh engine. It does not add invisible damage bonuses, wall penetration or extra kill cash.

## Interactive businesses

At a robbable shop's rear counter use **TALK TO STAFF** for a short response informed by local trust and robbery memory. **STOCKROOM ACCESS · $75** buys persistent access while below 30 heat. At the blue aisle marker, **ENTER STOCKROOM** visits a separately instanced storage room; **RETURN TO SHOP** returns to the public room. Rooms retain the existing collision-tested walking aisle and dispose their resources when switched. The stockroom has storage props and a safe, no public crowd or remote service desk. Existing public counters and services remain physical.

Two robbery approaches:
- **HOLD UP REGISTER** in the public shop: normal 4-second held bagging, frightened customers, more heat and witnesses.
- **QUIET SAFE · 8s** in its unlocked stockroom: longer held safe interaction, lower initial heat, shorter repair closure and no active witness. Release/move away resets the action.

Loot is not free money: both still need a getaway car, escape and single settlement with Nola. Death/reload/expiry/abandonment loses the unsettled bag; fees/access purchases are not refunded. Bank and riverboat heist stages are unchanged.

## Lasting consequences

Loud shop robberies close the shop for **300 outdoor simulation seconds**, quiet safe jobs for **150**; the existing 240-second robbery-site cooldown is separate. Closure changes the facade sign, blocks entry/services/offer acceptance, hides decorative storefront customers, and pauses that owned shop's property income/laundering. Repairs, witness time and keys persist across save/reload; offline wall-clock time does not silently clear them. Normal upkeep still applies.

A loud robbery leaves a **600-second witness alert**. After reopening, approaching within 10m of the visible facade with actual line of sight and no active disguise can trigger one +18-base-heat recognition report. This uses the existing weather/crew heat multipliers. No remote tracking: hidden/distant/disguised players are not recognized. Quiet jobs have no witness. Robberies reduce neighborhood trust; existing reputation effects continue. Witnesses are shop-level memory, not persistent individual NPC biographies or a citywide facial recognition service.

## Driving feedback

Current distinct handling and damage stay authoritative. Cars now show acceleration/braking pitch, steering roll and slight speed-dependent body movement; existing brake lights remain functional. Procedural filtered tire noise accompanies skids and hard braking, with cooldown-limited extra impact thump. Audio respects the existing SFX/mute buses and fades with engine stop/pause. No external samples, rigid-body suspension, destructible meshes or licensed engine recordings are added.

## Four new city contracts

Find the offers via phone/City Map, then visit **Mama Nola's back desk → Contact → Local conversation**. Complete/skip the existing opening tutorial first. Contracts share the existing exclusive activity slot; each pays once per campaign. Death, expiry, abandonment or reload cancels without payout; unfinished contracts can be accepted again at the contact after cooldown. No temporary enemy kill payouts.

- **Shadow on Canal** ($1,500 clean, 240s): approach the marked sedan in a car to start it. Tail at **12–45m** for **25 seconds**. Under 12m raises suspicion; gunfire raises it faster. At 100 suspicion or 12 seconds over 65m, the tail fails. Return to Nola with the route. The car follows the connected, collision-tested road circuit; it is a bounded kinematic target, not an unscripted civilian schedule.
- **Rolling Manifest** ($2,200, 300s): intercept a moving truck on that road circuit. Aimed, unobstructed shots or close vehicle contact at speed reduce its condition. At zero it stops and two tagged guards appear. Resolve them, recover the manifest on foot, lose heat and report. The truck is a mission target, not a stealable garage vehicle; this is one truck plus responding guards, not a multi-vehicle convoy simulation.
- **Last Call Rescue** ($1,800, 200s): meet the witness outside the clinic on foot, bring a stopped passenger-seat car and Interact to board. The witness is visibly seated. Collisions can hurt them; deliver alive to the guest house before expiry. Leaving/switching the assigned vehicle returns the witness to pickup without resetting time. Motorcycles cannot board them; this passenger reserves the companion seat. This is a separate contract from the earlier musician rescue.
- **The Planned Exit** ($2,400, 300s): choose quiet or diversion at the contact; requires paid loyal crew. Call a Follow companion through Nola's local crew services. They must be actually seated in the car at three raw road checkpoints. Diversion creates more heat than quiet. Lose heat and report on foot with the active paid loyal companion within 12m. The player drives; no autonomous crew getaway driver is claimed.

## Saves and verification

No dependencies, external art/audio, paid services or network backend were added. Version-2 saves get empty bounded city-memory/contract defaults without losing prior progression. Temporary target cars/NPCs release on completion/failure/death. Interrupted adventures do not restore their enemies as ordinary reward-bearing rivals.

Run `npm test`, `npm run typecheck`, `npm run build`. Added tests cover phone non-mutating GPS, histories/migration, repair timers/real economy, visible one-time witness reports, both robbery methods, all shop stockroom aisles, squad choices, vehicle feedback, all new contract rules and a live moving-tail simulation. Existing six-chapter campaign and old mission/control suites remain part of the complete regression run. These are automated simulation/integration playthroughs, not proof of a full real-time browser playthrough. Browser evidence, viewports and any unverified gameplay are recorded in the PR.
