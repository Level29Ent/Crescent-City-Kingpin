# Furnished city & exploration loop

## Destinations
40 enterable rooms (8 new): Charity Street Clinic, Levee Hardware & Supply, Tremé Reading Room, Canal Night Diner, Garden District Florist, Royal Street Tailor, Basin Street Rehearsal Hall and Westbank Dispatch. Each appears in Buildings and City Map and uses a tested facade entrance. Rooms are instanced public visits; visiting does not buy a property.

## Decor and materials
Every enterable interior uses locally generated repeating wood, tile or metal flooring and brick rear-wall materials, plus windows, curtain panels, skirting/cornice trim, potted plants, framed artwork, reception ledger/computer/lamp and a civilian attendant. Theme dressing adds bottles/speakers, books, cups/table settings, chips/cards or workshop stock/tools. Existing furniture and collision remain; the central exit–supplies–desk aisle stays clear. Textures and attendants are disposed on exit. The attendant is decorative, not a new dialogue system.

This furnishes all **enterable rooms**, not every non-enterable exterior/background building in the generated city. No external art downloads or photorealism claim.

## Gameplay
- Walk to the central floor emblem (x=0, z=1 indoors), then E / INTERACT to inspect supplies. Once per room, per save. Warehouse/garage themes give one part; other themes give one medkit. No idle or repeat cash reward.
- Carry up to 5 medkits. A full pouch does not consume a room claim. H or the MEDKIT HUD button heals 35 up to 100. No consumption at full health and no reviving dead players. Keys do not repeat-use on hold.
- Indoor Shift sprint uses the existing stamina drain/exhaustion/recovery mechanic, with normalized diagonal movement and collision.
- Three additional clean work orders connect new rooms: clinic supplies, hardware restock and event flowers. Existing accept/pickup/delivery/time-limit/single-payout rules apply.
- Inspected rooms and medkits persist through save/export/import. Older saves default to no supplies claimed and zero medkits. Existing cash, property and gear progression is unchanged.

## Checks
Tests instantiate all 40 rooms, check detailed mesh/textured surfaces and uninterrupted walking to supplies, desk and exit, and confirm texture disposal. Supply capacity, once-only claims, old/malformed saves, medkit caps and death/full-health guards have focused tests. Existing navigation/work tests exercise every new entrance and work route. Browser verification is recorded in the PR.
