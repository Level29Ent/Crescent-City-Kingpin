# Carnival & syndicate expansion

This builds on the existing single-player Three.js city. It is not a separate 2D arena or a replacement engine. All reference-inspired parade art is original procedural geometry; the supplied photographs are not bundled or presented as game screenshots.

## Mardi Gras mission

Choose **Mardi Gras / Missions** on the title screen or **Empire → Missions → Join Mardi Gras parade**, then enter/resume the city. A waypoint turns the camera toward the destination. Travel to each marker and press **E / INTERACT**:

1. Meet the marshal at Royal Street (0, -18).
2. Recover three float-power crates at the south barricade, bead stand and north balcony.
3. Follow the lead jester float from z=42 to z=102. Stay within 18 m for 40 seconds of escort progress, then interact at the finale.

The HUD’s **Parade Balcony** button offers a paused elevated overview; Return to Play restores the prior play/pause state. It does not teleport the player or complete objectives.

The six-minute mission has four moving, stacked parade floats, giant jester masks, purple/green/gold lamps and beads, ribbons, overhead bunting, 340 instanced spectators, float riders and falling confetti. Floats and static decorations are batched per material. This is a stylized low-poly interpretation of the reference photos, not photorealistic New Orleans. Spectators and floats are decorative, not targetable combatants or vehicle colliders. Shooting along the route raises police heat. The mission awards dirty cash and a unique Krewe Captain Medallion; its permanent +5% reward buff applies to subsequent side-mission completions.

Other spatial, timed missions: French Quarter Night Courier, Recover the Stolen Purses and Chop Shop Parts Run. Mechanics returns six parts for vehicle/weapon upgrades. Missions and escort progress persist through saves; mission and transport timers resume after offline sessions instead of failing unseen.

## Weather, controls and shooting

A 16-minute day/night cycle remains in place. Weather cycles every 150 seconds: Clear → Rainstorm → Fog → Heatwave. Rain has visible falling streaks, rain ambience, 60% police sight range and 35% lower heat generation. Fog cuts police sight to 45%. Heatwaves raise heat generation 20% and sprint stamina drain 40%. Night multiplies delivery/transport and most side-mission rewards by 1.3; purse recovery and one-time rival-courier shakedowns pay 1.25×. Police thresholds and paid hideout options remain.

WASD **and arrows** work on foot/in cars. Movement accelerates and decelerates smoothly, camera following is damped, and selecting a waypoint turns the view toward it. **R** reloads, **1–5** select owned weapons; touch adds RELOAD, WEAPON, AIM and held movement buttons. Right-mouse aiming reduces spread. Magazines: pistol 12, SMG 30, shotgun 6, carbine 24, marksman rifle 5. Spare ammunition is unlimited, but reloads take 1.6–2.2 seconds and block firing. Reload progress resets on weapon change.

Shots use the camera's center hit point followed by a muzzle-to-target obstruction check. Added recoil, short-lived tracers, muzzle flash illumination, impact sparks and headshot feedback improve shooting presentation; this remains a stylized hitscan simulation, not physical ballistics. An armed rival within 2.5 m can be shaken down once via E, immediately alerting that rival and adding heat. Civilians cannot be shaken down. The one-time flag saves with each rival.

Dynamic pickups spawn on collision-free land 12–45 m from the player, never within 12 m of the original spawn, every 22 simulation seconds (maximum 12, 180-second lifetime). Walk within 1.8 m to collect gold cash stashes, purple contraband or teal parts. Pickups have minimap dots. They never spawn directly under a stationary player. No controlled corner or purchased income property means **zero idle income**. Only owned assets produce passive earnings.

## Empire systems

- **Five neighborhood selectors:** French Quarter, Skidrow, Uptown, Warehouse, Port of NOLA. Existing saved corner IDs are retained for compatibility; the former Bayou Landing selector now represents the Port. Each controlled district has three upgrades, +25% corner revenue per level, and slower rival influence growth.
- **Garage:** buy/store up to eight sedans, getaway coupes, smuggling trucks or armored vans. Customize paint; upgrade engine and armor with clean funds + parts. Deploy at HQ within 35 m, then E to drive. Stored upgrades/cargo runs persist; physical cars reset to parking/garage deployment after reload as before. Runs consume crates upfront, occupy that garage vehicle, and settle exactly once. Rain/night, vehicle capacity, armor, heat and the airboat outpost affect the simulation. Automated runs are timer-and-risk simulations, not autonomous cars pathfinding across the rendered world.
- **Heist board:** Bank Vault, Port Shipment, Casino Vault and The Mint. Recon must be gathered physically at the target. Assembly requires the listed paid/loyal specialists and clean planning fee. Execution is three tactical choices with quiet/noisy consequences and a final probability roll. Failure costs loyalty, successful heists award dirty cash and unique gear. A ten-minute cooldown prevents repeated free claims. The Mint requires Demolitions, Hacker, Enforcer and front-business level 3. Port Shipment success grants the Cargo Terminal takeover.
- **Interior:** a six-slot safehouse floor-plan screen allows placement/moving of a camera grid, vault, weapon locker and poker table. Cameras add defense response time and early raid warning; vault raises dirty storage from $100k to $500k and halves raid seizure; locker gives +15 defense and +10% damage. Poker is five-card draw with a $25 clean buy-in and explicit payout table, not passive revenue. This is a configurable interior management view, not a walkable indoor 3D scene.
- **Rivals:** Violet Crown / Delphine Moreau and Iron Levee / Silas Boudreaux have profiles and district influence bars. Every 120 simulation seconds they increase influence in a selected district. High influence on a player corner creates a turf showdown. Defending successfully reduces influence; timeout loses the corner and income. District upgrades reduce expansion pressure.
- **Weapons/customization:** Carbine, marksman rifle, five tuning levels, garage paint/upgrades, purple/green Krewe outfit and Carnival Gold outfit. Legendary gear buffs: precision barrel spread, transport plating, armor, property-income signet and side-mission medallion.

## Properties and fronts

**Properties** includes all requested locations plus a starter Laundromat. Purchases consume clean capital and have real-day upkeep. Missed upkeep disables bonuses until paid. Rackets require an active paid/loyal crew member. A four-type inventory (crates, electronics, art, moonshine) has a 20-item cap, raised to 60 by the dock.

- Fronts: Bywater Laundromat; French Quarter Jazz Club & Lounge (Nightclub tier); Garden District Antique Shop; Bywater Dive Bar; Faubourg Marigny Cafe & Bakery; Downtown Grand Hotel & Casino (highest tier).
- Rackets: Tremé Backroom Dice & Poker Den; Warehouse Import/Export Dock; Magazine Street Herbalist; Central City Chop Shop.
- Tactical: Bayou Airboat Dock; Uptown Pawn Shop; Above-Ground Mausoleum; Corrupt Precinct Backroom.
- Landmarks: Port Cargo Terminal and Grand Hotel & Casino; The Mint is the endgame heist target.

Front laundering has separate per-minute capacity, fee/risk and daily upkeep. Hacker gives a 3 percentage-point laundering discount. Cafe produces clean commercial revenue only after purchase and discounts hiring. Antique Shop suppresses heat. Dice den has high cash/high heat. Dock produces crates/capacity; chop shop produces parts. Airboat dock offers paid low-cost cooling and transport-risk reduction. Pawn Shop improves resale. Mausoleum protects goods from standard raids. A funded precinct gives warnings; the Safehouse also offers a separate paid precinct settlement. Port improves resale premium; Casino has the top owned-property income and laundering capacity. Buying it does not require winning a combat takeover; it is a clean-capital endgame purchase.

## Persistence and verification boundaries

The existing version-2 campaign save accepts older saves and fills the new expansion defaults. It now stores properties/upkeep, front capacities, levels, garage/transport, parts, furniture/poker, rival influence, heist phases/cooldowns, legendary gear, active mission/escort and completed side missions. Four-type inventory migration retains the original three entries. Offline revenue remains 35%, capped at 24h, now including owned income properties with upkeep; cash capacity is enforced. Offline sessions do not roll surprise raids/showdowns.

The previously implemented global leaderboard is unchanged and still needs its shared database connection/owner terms acceptance; there is no local list labeled global. Local achievements retain one-time rewards. No new paid infrastructure is provisioned by this code change.

Run `npm test`, `npm run typecheck`, and `npm run build`. Tests cover old campaign behavior plus weather, zero idle income, property eligibility, front capacities/fees, district levels, one-time vehicle delivery settlement, phased heists, rival showdowns, spatial parade objectives/escort, night rewards, migration and poker ranks. Long-duration play balance, actual touch gestures, live leaderboard storage and complete combat progression require further playtesting.


## Extended vehicle roster & cash props

The garage now offers ten vehicle types. The original sedan, coupe, smuggling truck and armored van keep their saved IDs and stats. Added: Quarter Runner motorcycle (one crate, 1.45× speed, no armor), Bayou V8 muscle car (three crates), Levee 4×4 SUV (five crates), Crescent City Taxi (three crates), Port Hauler box truck (12 crates, slow bulk transport), and Krewe Shuttle minibus (seven crates). Each can be bought, stored, painted, upgraded, deployed and dispatched with the existing rules. The eight-vehicle ownership limit is unchanged. Motorcycles have two wheels and a visible riding pose; SUV, muscle car, taxi, truck and minibus have distinct procedural body details. Motorcycle handling/collision width and heavy-vehicle steering/collision differ from ordinary cars.

**Garage → Vehicle showroom** provides a free drag-to-rotate 3D preview before purchasing. It does not grant vehicles. Only a static frame and user rotation/resize redraws are rendered; preview WebGL resources are released when changing previews/tabs or closing management.

**Empire → Cash** shows original engraved-style fictional Crescent Reserve notes and banded stacks. They have serials, ornate borders, a cathedral vignette, paper grain and visible layered edges, clearly labeled GAME PROP / NOT LEGAL TENDER. The display is decorative; the clean/dirty ledger is authoritative. Arena cash stashes replace gold cubes with four layered $20 game notes and still award $80 exactly once on collection. Their placement remains spatial and never under the standing player. No income rates, cash balances or reward amounts were increased by the visual redesign.

## Analog touch joystick & walkable interiors

Enable **touch joystick & action buttons** on the title/pause screen (automatic on coarse-pointer devices; preference saved locally). Drag the left circular pad: small deflections walk slowly, full deflections move at full speed, and diagonals are capped to normal speed. In a vehicle, up/down is proportional throttle/reverse and left/right steers. The pad uses a deadzone, clamps the knob to its circular base and resets on release, cancellation, lost capture, menus, blur, visibility changes and building transitions. Keyboard movement and right-side held action buttons remain available. Drag the rendered city to look; indoor camera is fixed behind the avatar, with up moving toward the back wall.

**Empire → Buildings** lists eight free public interiors: Mama Nola’s back room, French Quarter Jazz Lounge, Garden District Antique Shop, Marigny Cafe & Bakery, Central City Chop Shop, Uptown Pawn Shop, Grand Hotel/Casino Lobby and Warehouse Cargo Office. Cyan ground rings and minimap dots mark entrances. Enter on foot within four meters using E/INTERACT; HQ accepts its 24-meter sheltered approach through the Buildings list. Distant entries mark a route instead of teleporting you.

Rooms have distinct furniture, lighting, signs, wall bounds and furniture collision. Walk to the rear service desk and interact to open the appropriate existing management section. HQ Safehouse also links the original gear/import-job shop. The chop shop can deploy a stored vehicle just outside its entrance. E at the teal front exit, Escape, or **Exit Building** returns to your unchanged outdoor position. Interior visits pause outdoor combat, weather time, mission timers and income. No weapons fire or free rewards inside. Entry does not buy a property or unlock its income/bonuses. Saving indoors retains the street position and resumes outdoors on reload, so room coordinates cannot corrupt the campaign map.

These are separate furnished 3D rooms reached by door transitions, not seamless multi-floor versions of every exterior. The existing tactical furniture placement screen remains independent of these public rooms.
