# Physical waypoint entrances

Building/home, business and heist pins now share signed exterior doors on existing building facades, rather than independent rings in the middle of the road. Removed the old free-standing business rings and 60 m HQ beam so they cannot obscure the doorway. Each has a visible frame, glass panel, handle, canopy, threshold and name/INTERACT sign. Walk within 3 m of the threshold on foot and press E / INTERACT. The Buildings list uses the same range; the old 24 m HQ shortcut is removed.

There are 32 furnished instanced interiors, including ten additional business/heist rooms. All business and heist directory entries are associated with a room. Destinations at the same address can share a public room; entry never grants property ownership or income. These are room transitions, not seamless holes cut into the world mesh.

Tracked business destinations enter the room before opening Properties at its desk. Tracked heists enter their lobby before the desk gathers recon or opens planning; existing crew/fee/cooldown rules still apply. The player's saved street position supplies on-site service checks inside. Exit Building or the teal exit returns to the street. Saved named building routes are resolved to the new door on reload.

Work/contact objectives at building addresses use the matching threshold; their existing pickup/contact action can happen at the door, followed by room entry on another interaction. Turf fights, combat encounters, driving checkpoints, import auto-deliveries and parade escorts remain outdoor gameplay, not automatic room entry. Their markers must still match their interaction checks. This does not make every generated background building enterable.

Validation covers every facade's collision-free approach, building/business/heist room binding, unique doors, named route category preservation, objective progression and reward guards. Browser checks and any remaining limits are recorded in the PR.
