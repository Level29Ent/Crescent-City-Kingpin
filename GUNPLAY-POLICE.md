# Gunplay & recognizable police

- Head/body targeting now uses separate ray/sphere volumes instead of projecting every target hit onto chest height. Headshots retain the existing 2× modifier; world geometry still caps the muzzle ray so shots cannot pass through buildings.
- Aim and crouch tighten spread, movement broadens it, and sustained fire adds bloom that recovers while not firing. Recoil is a recovering camera kick rather than permanently adding to the player's look pitch.
- Damage falls off beyond 35% of weapon range, bounded at 55% base damage. Existing weapon cooldowns, magazines, reloads, upgrades, traits and cover remain.
- Crosshair expands with bloom/tightens on aim. HIT / HEADSHOT / TARGET DOWN feedback appears briefly only after confirmed target hits. Reload is blocked indoors, in cars or while dead. All gun noise, including pistols, can panic nearby civilians.

Police officers retain navy shirts/trousers, peaked caps and boots; added duty vest, gold badge, shoulder patches, name strip, radio/antenna, belt pouches and a readable POLICE back patch make their role clearer. Uniforms are fictional, not a specific real agency's replica.

Police cruisers retain the procedural black/white silhouette even if generic GLB cars become available. Added POLICE door lettering, push bar, antenna, red/blue emissive lightbar and two short-range non-shadow point lights. Existing siren behavior remains. Two street cruisers patrol after onboarding and switch to pursuit at heat 40+. At close range, pursuing cars may deploy uniformed officers, with a shared 25s cooldown and eight-officer cap. Existing foot-police and roadblock heat systems remain; this is still lightweight grid traffic, not full vehicle pathfinding or a new dispatch simulator.

Garage's Police Recognition Guide previews the cruiser and officer without purchases, cheats or combat. Screenshots can be inspected there. No uniform disguises or purchasable police cars are added.

Tests cover volume hits/misses/ranges, falloff/spread bounds and officer/cruiser geometry/lightbar changes. Run npm test, npm run typecheck and npm run build. Preview verification is recorded in the PR; full fights, nighttime GPU performance and long chase/deployment balance require playtesting. Existing saves and money rules are unchanged.
