# Living city gameplay update

Open **Empire / M → City Life**. The board is also opened by E at an interior's back desk. Existing garage, properties, story and heist boards remain available as tabs. Finish the three tutorial steps before accepting operations.

## Useful interiors
- Cafe-themed rooms sell a $25-base meal: full stamina and 120 seconds of rested sprinting (-20% stamina drain).
- Charity Street Clinic sells full healing for $80 base, never a revive.
- Garage-themed rooms repair the last driven car parked within 30m of the entrance for $100 base. Car must still exist. No remote repair from the global board.
- Services have a shared 30-second **outdoor simulation** cooldown. Interiors pause the city, its timers and pursuit; waiting indoors is not a police escape. No purchases when the service is unneeded or funds are insufficient.
- Reputation discounts services by up to 15%; trained mechanics additionally discount workshop repairs.
- Nightlife desks open 17:00–05:00, most others 06:00–22:00; clinics, workshops, HQ and guest house stay open. Facade window colors/signs show desk status. Public rooms remain enterable, with their existing supplies. City lighting, weather and opening hours use the saved campaign clock.

## Driving and police
- Sports, heavy, motorcycle and utility vehicles have different acceleration, braking, turn rate and grip. Space is the service brake; B / HANDBRAKE permits a tighter sliding turn. Touch throttle remains proportional. Tire smoke and collision feedback are pooled.
- Collision damage reduces vehicle condition and speed, darkens/dents the bonnet (motorcycle tank), and produces smoke below 35%. Impact cooldown prevents per-frame wall damage. Armor reduces condition loss. Garage condition survives saves/redeployment; ordinary street cars are reset on reload as before. Recovery-car condition also persists; after reload its car respawns at the pickup and the marker points back to it until re-entered.
- Police have detection (1.5s visible exposure), pursuit, search (after 3s out of sight), and escape states. Only actual officer/cruiser line of sight updates the shared last-known position. Searchers head there, not to a hidden player's current coordinates. Reinforcements deploy only in pursuit. Stay unseen for 18 + heat × .12 seconds to clear heat; reacquisition restarts pursuit. Undetected heat also clears after that time hidden. HUD shows phase/detection/search progress. Death keeps the previous full police reset.
- Traffic stops to yield near pursuing cruisers. Pedestrians flee gunfire, close traffic and nearby sirens. This remains bounded grid traffic, not a full driving/pathfinding simulator.

## Five street operations
All payouts require on-site interactions, prerequisites and remaining time; no completion by clicking a menu. Each operation pays only once per save. Failure/abandonment may be retried. Only one tracked operation/work/story/side-mission/daily activity runs at once; accepting an operation cancels an existing import contract without payout.

1. **Borrowed Wheels** ($750, 240s): recover the marked gold estate wagon; return it with condition above 20%.
2. **Last Ride Home** ($950, 200s; one completion): meet the musician on foot, then deliver them by car, not motorcycle. The companion follows on foot and is hidden while riding; no passenger combat/health simulation.
3. **No Alarms Tonight** ($1,200, 240s; one completion): post-office-to-gallery delivery, no gunfire and heat below 30.
4. **Keep the Music Playing** ($1,500, 300s; two completions): meet the club manager, defeat three extortionists and report back.
5. **The Canal Exchange** ($2,600, 360s; three completions): scout the bank, recover a case at the mint, deliver to the dock after losing police. Quiet approach requires a paid loyal smuggler and no gunfire/wanted heat; loud approach adds heat and three guards. This is an additional street heist, not a replacement for existing major heist planning.

Death cancels operations. Saved combat guards retain operation identity. Abandonment/completion removes operation guards, companion and recovery vehicle without extra rewards.

## Combat, controls and progression
- Hit reactions briefly stagger movement/fire and visibly rock enemies. Nearby enemies route around sandbag ends and alternate hiding/firing. Enemies beside sandbags take 35% less damage. Existing player crouched-cover damage reduction remains.
- City Life includes saved touch size/opacity, left-handed layout and optional gentle aim assistance while touch-aiming. Assistance only considers visible hostile targets inside a narrow cone, not civilians or targets through buildings. Desktop aiming is unchanged.
- One operation unlocks three tire/brake levels ($300 × next level + one part): +2 grip and +12% service braking per level.
- Two unlock three crew-training levels ($400 × next level). Each level adds three remote-defense points, plus the specialist-specific effect shown on the board. Training benefits require a paid loyal specialist.
- Three unlock three business-improvement levels ($600 × next level): +15% of base per level to owned-property dirty revenue and front capacity. Ownership, crew and upkeep gates remain. Cafe clean income is unchanged.
- Legal work and operations build bounded neighborhood standing; harming civilians lowers it. Standing changes neighborhood greetings and service discounts, not ownership or passive income.

Older saves receive empty/default state; malformed imported values are bounded. Existing cash, properties and equipment are retained. No dependencies, external art, accounts or network services were added.

Validation and preview status are recorded in the PR. Long pursuit/mission balance and low-end/mobile GPU performance still require playtesting; passing simulation tests alone does not verify browser rendering.
