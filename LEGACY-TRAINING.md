# Guided million-dollar campaign

## Tutorial and objectives

New runs start on foot with a pistol locked until needed and a cyan arrow/marker toward Mama Nola (30,4). Walk with WASD/arrows or the left joystick. Within eight meters, E / INTERACT advances to a single practice rival; aiming, shooting and reload controls are introduced. Defeat that rival to unlock driving and the marked sedan at (12,0). Take a vehicle to (0,60) for the short delivery, $250 dirty, and the open empire loop. Non-tutorial rivals do not attack during these steps. Saves from before this update migrate with tutorial complete so existing players are not forced through it. Escape or HUD Pause opens the backup menu, including indoors; Exit Building still leaves a room.

Empire → Legacy & Training provides an explicit Skip Tutorial option, traits and joystick sensitivity (0.5–2×). Traits: Streetwise (neutral), Wheelman (+15% vehicle speed / +15% action heat), Numbers Expert (+5 percentage points laundering return / -10% gun damage), Bruiser (+15% gun damage / -15% sprint speed). Choose before tutorial completion. Alternate Uptown and Port starts unlock at generations 2 and 3 and skip tutorial; Quarter remains available. No starter standing-income payment is introduced.

The main win condition is **$1,000,000 clean capital**, not $250k. A neon-noir side objective card shows tutorial, daily route or empire progress. Small/short screens retain the primary objective and hide the secondary card to protect canvas space. Milestones queue once-only rewards and display them upon opening Empire: first corner ($150 clean), $10k laundered ($500), and million-dollar legacy unlock.

## Backup and autosave

The existing dual localStorage/IndexedDB save system persists all campaign structures, inventory, clean/dirty balances, delivery streaks, captured turf and property holdings. Management actions, pickup collection, tutorial progression and successful deliveries additionally save immediately; the 30-second timer and page-hide/unload saves remain. Esc → Save Game, Export Save Code and Import Save Code are available. Export uses a versioned CCK2 base64 UTF-8 payload. Import validates the version/data with the existing restoration boundary and confirms before replacing the current device’s run. It does not grant authenticity or anti-cheat protection. Keep backup codes private: they contain the player alias and full local progress. Importing resumes on the street; in-progress timed import deliveries follow the existing failed-on-reload policy. Storage failures are reported rather than claiming success.

## Driving, audio and micro-events

Web Audio mixes slower jazz-like bass/chords with a smoothly blended faster synth/brass-like rhythmic layer during nitro or heat >=30. Ambient noise, night insect chirps, engine roar, police alert tones and gunshot/cash/UI sounds are procedural (not licensed recordings or studio tracks). Nitro adds a rising whoosh. Three independent audio buses and HUD mute remain. High-speed crashes add reduced-motion-aware camera shake and heat. Nitro emits a bounded gray tire-smoke pool; laundering animates flying money glyphs and plays a chime. Muzzle flashes and impact effects remain. No new explosive weapon/physics system is added.

Every ~55 seconds of unlocked-city simulation, a temporary nearby event is selected: checkpoint, shipment ambush (during an active import job), or a street-performer obstruction. These are lightweight local encounters, not a citywide traffic AI. Checkpoints block slow passage: E pays $100 dirty to reduce heat, or detour, or smash through above 15 speed for +15 heat and shake. Rivals spawn on an ambush; performers slow close movement and driving into them raises heat. These events are transient rather than saved map entities. Reckless speed over 32 adds heat. Existing cruiser roadblocks, hideouts, raids and turf-retaliation systems continue.

Priority import payouts now apply Golden Hour 1.15×, After Hours 1.35× or ordinary-day 1×, plus 1.2× while heat >=60. This is evaluated at delivery completion. Night lighting remains the existing dynamic sky/fog/neon system.

## Crew, safehouses and vehicles

Mechanic Lieutenant: 25% lower clean cost for engine/armor upgrades and a $50 active armor-repair ability (60s cooldown). Accountant: +25% laundering-front capacity and three percentage points lower front fee. Paid/loyal Enforcers attempt automatic defense every 60s with a 60% chance when a turf attack is active. Existing wages/loyalty rules govern all bonuses. These extend the current crew rather than introduce squads or real-time repair simulation.

Legacy & Training also offers heat-gated $100 fast travel to HQ or owned public properties; it never makes public room entry itself a paid-property unlock. Owned laundering fronts process a bounded batch while offline (maximum ten hourly capacity units), converting existing dirty cash rather than inventing currency. All online property/economy rules, upkeep, raids and turf protection remain. The existing public interiors contain no new free income.

Garage tuning in Legacy & Training adds three nitro-capacity levels ($400 each, -15% boost drain per level), underglow, matte materials and gold rims ($150 each). Changes persist per stored garage bay and apply on deployment. Existing engine/armor upgrades, parts, paint and cargo transport remain in Garage. Visual changes do not secretly improve armor.

## Daily route, rankings and share cards

The UTC date deterministically selects a three-checkpoint route shared by everyone. Start it from Legacy & Training; mark the next checkpoint, then physically travel within seven meters. Completion awards $1,000 clean once per attempt and stores the best local time. This is a seeded delivery speedrun rewarding clean capital, **not** a server-authoritative time-to-generate-$1M mode. Pause/interior time does not advance it. Self-reported times can be submitted with the existing leaderboard API, under a dated ascending-time board. Requests validate the UTC date/time bounds; Redis daily keys expire after two days. Like other single-player scores, local editing can falsify them.

**The global service still requires the previously pending shared Redis connection and Upstash terms acceptance.** No database is provisioned by this code. UI does not manufacture competitors when unconfigured. Backend daily sorting is mock-tested, not live-tested.

A Download Share Card action creates a 1200×630 PNG with alias, generation, clean capital, total cleaned, corners, max heat and police-heat escapes. Available mid-run, and from Share Card / Retire at the ending. It uses a browser download rather than uploading player data to an external service.

## Retirement

After reaching $1M clean or surviving a precinct raid, type RETIRE in Legacy & Training to replace the local run with the next generation. Inherit 5% clean wealth capped at $100k, plus permanent +10% **owned-turf** revenue and nitro recharge per generation (capped at five). No free starter shop revenue is reintroduced. New runs lose current turf, crew, buildings, goods, cars and missions; export first if desired. Retirement is optional and never triggered silently on death. Ordinary deaths retain existing cash-loss/respawn rules; “busted” means the current precinct-raid state, not a new jail/prison system.

## Verification limits

Run npm test, npm run typecheck and npm run build. Deterministic tests cover tutorial ordering/migration, save transfer, UTC route identity and one-time rewards, inheritance caps, milestone idempotence and peak multipliers alongside the existing gameplay suite. Real-device multitouch, full tutorial combat/delivery, long retirement progression, listening-based music review and live Redis rankings still require playtesting.
