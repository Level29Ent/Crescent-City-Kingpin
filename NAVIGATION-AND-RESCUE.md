# Navigation, passengers and performance

This extends the merged living-city update. It replaces the earlier straight-line traffic/cover and hidden-passenger limitations; existing missions, money and unlocks remain.

## Traffic and police driving
- A directed road graph has **162 usable lane nodes and 406 street/turn edges** on the generated city. Lane offsets and sampled quadratic junction turns are checked against real building/prop/pond collision. Unsafe disconnected stubs are excluded, not driven through.
- Civilian traffic follows connected multi-street routes, visible red/green signals with all-red clearance, following gaps, smooth acceleration/braking and exclusive junction reservations. Signals are instanced (three additional draw calls), not separate lights casting shadows.
- Parked cars close affected lane edges. Closures and the remaining connected component are cached until obstacles change; routine routes choose destinations with a way out. Initial spawns are placed in that reachable network before becoming visible. Cars stop rather than ram a newly blocked current segment; a player can still deliberately block traffic and must clear that obstruction. No teleporting recovery or traffic-car overtaking physics is claimed.
- Pursuing/searching cruisers use graph routes to the **observed last-known position**, not hidden player coordinates. They replan at most every two seconds and slow for curves, traffic and occupied intersections; pursuing police may pass red signals, but not intersection reservations. Civilian cross traffic yields while same-lane leaders continue to avoid a siren deadlock.

## Enemy navigation and cover
- Collision-aware 2m-grid A* routes around buildings and sandbags; edges are sampled every 0.25m to prevent corner/thin-wall cutting. Spatial collision bins avoid scanning the whole city for each test. Searches are bounded at 3,500 expansions.
- One or two new paths may be planned per frame depending on graphics budget; agent routes have cooldowns and are rechecked before walking. If no safe route exists, an actor stops instead of phasing through walls. This is grid pathfinding, not a navmesh for every decorative space.
- Enemies remember their last actual sighting. Police share dispatch sightings; other enemies investigate briefly rather than tracking hidden movement forever.
- Cover slots are reserved per combatant and expire/release. Guards choose the protected side, navigate around sandbag ends, and alternate hiding with moving out to peek/fire. Hit stagger is limited to once per 0.65s so rapid weapons cannot permanently stun-lock enemies.
- Police foot reinforcements are paced at one per three seconds, capped at eight, rather than appearing on consecutive frames.

## Rescue passengers
- Drivers and the rescue musician use visible seated poses in car cabins; windows are translucent. Motorcycles have no passenger seat for this mission.
- After meeting the musician, they walk along safe routes rather than teleporting to the player. Stop near them and wait 1.1 seconds for the boarding animation. Driving away early leaves them behind and the route points back to them. Exiting places them beside the previous car where collision permits, then they follow on foot.
- Health is shown in the operation objective and persists with location across saves. Vehicles are recreated on reload, so stale vehicle attachments/boarding animations are deliberately cleared and the musician must board again. Older active rescue saves start the companion at the pickup with full health.
- Crashes, nearby stray enemy shots, friendly fire on foot, and traffic impacts can injure the musician. Cars absorb 60% of passenger damage; foot traffic impacts have a 45-damage cap and 1.2s cooldown. A dead musician fails the operation with no payout. Delivery requires a living passenger actually aboard the current four-wheel vehicle.
- No full ragdoll, door-bone animation or independent passenger combat AI is claimed.

## Mobile/performance
- **Graphics → Auto** adapts resolution between 60% and 100%, stepping down only after sustained measured frame rates below 34 FPS and recovering slowly above 54. Paused/loading outliers do not drive adaptation. A render-scale/FPS estimate appears on the start screen. Graphics preference persists locally.
- At lower budgets, shadows and bloom are disabled, rain reduces from 1,000 to 300 streaks, river vertex updates cap at 10Hz, distant actor rendering is culled and distant rig poses update less often. Combat, health, mission timers and movement are not skipped or slowed by those visual budgets.
- Manual Performance/Balanced/Cinematic choices remain. This provides adaptive load reduction, not a guaranteed FPS target or a measured mobile GPU speedup.

## Validation
Automated checks cover actual city lane connectivity/clearance, alternate routes, A* wall avoidance, frame planning limits, exclusive cover, rescue boarding/injury/saves/payout guards, graphics hysteresis and rain draw ranges. Eight-minute deterministic traffic simulations run with and without the **actual parked fleet** and require all eight cars to keep moving in the final minute. Browser/GPU testing status is recorded in the PR; real devices and long mission playtests remain necessary for feel and balance.
