# Waypoint, stage and doorway fixes

## Proven causes

- The large transparent cyan cylinder was an 80m-tall delivery marker. Standing at its center filled the camera. The tutorial paid out but left the completed target behind.
- Heist recon previously required returning to the Heists panel and clicking Gather Intel. E at the marked target did not dispatch recon.
- Mission/work pickups and drop-offs required E, while import/daily/tutorial delivery arrivals were automatic. Nearby prompts did not explain all these distinctions, especially when in vehicles.
- Generic door selection could be confused with a nearby vehicle, turf point or tutorial lock, and the Buildings list did not provide a full categorized city map.

## Fixes

The route marker is now a 2m-radius ground ring, never a full-screen cylinder. Tutorial, work, story, daily and import completion/failure clear their targets; loaded stale tutorial delivery routes also clear. Active objectives remain authoritative if the player clears a manual route.

All catalog markers and eligibility checks share a collision-free approach resolver. It searches up to 24m around an obstructed coordinate and uses the same resolved point for displayed routes and interactions. Automated checks confirm every catalog entry is walkable and clear at player radius. This handles world geometry, not dynamic NPC traffic or every custom car bounding box.

E, touch INTERACT and a visible HUD **E · INTERACT** button share the interaction dispatcher. Tracked map locations preserve their category: heists gather recon/open planning, doors enter on foot, businesses open management, turf starts a fight, and unaccepted mission/job/story pins explain/open the correct board instead of silently doing nothing. Arriving at a heist does not waive required crew or fees. After recon, the Heists board opens with Crew Assembly; Execution remains its three-choice tactical UI.

A persistent arrival-instruction card distinguishes:
- E / INTERACT: mission stages, work pickup/drop-off, story contacts, recon, discoveries and doors.
- Automatic: active import deliveries within 6m, daily checkpoints and driving the tutorial delivery into its ring.
- Parade finale: remain beside the lead float for 40 seconds, then E at the finale.
- Interior: walk to the back service desk and E; teal exit or Exit Building returns outdoors.

No active accepted mission/contract means a map pin grants no payout. Combat stages still require defeating their rivals. Expired/abandoned stages pay nothing. New imports are blocked while another active objective owns the route.

## Doors and homes

Doors share a 6m on-foot arrival range instead of a 4m silent cutoff. A tracked door while driving first exits the vehicle; interact again to enter. Buildings directory and routes use the same approach. Public doors are no longer locked behind onboarding. A manually tracked door can be visited before finishing the tutorial; driving and combat tutorial gates still apply. No property purchase is required to enter public rooms, and visiting a room grants no income/ownership.

Added three free-to-visit themed homes (French Quarter Courtyard, Uptown Shotgun, Bywater Artist Loft), a Dive Bar and Laundromat room: 22 rooms total. These are public instanced furnished rooms, not owned/resellable houses or seamless world buildings. Existing chop shop (Central City at -60,0) is accessible through its cyan ring and the Buildings/City Map lists; its desk opens Garage.

## City Map

HUD City Map / Empire → City Map provides 90 named entries covering every room/home, business, heist, turf, mission stage, work pickup/drop-off, story contact, discovery and import drop, plus tutorial delivery. Filter by category. Pins show details and a Track button; directory rows show distance and exact instructions. Tracking routes never teleports, accepts a contract or pays money. Minimap has compact location dots; City Map is the readable named directory.

## Verification and limits

76 deterministic tests pass including every work/side-mission/story contact stage, all heist recon→assembly→execution gates, single reward claims, all 90 safe approaches, chop shop/home door ranges and interior desk reachability. Typecheck/build and preview flow checks are recorded in the PR. This does not mean every fight, delivery drive or all 22 room visits were physically playtested in Safari or on a phone. Shared Redis leaderboard setup is unchanged.
