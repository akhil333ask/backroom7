# Handoff: one continuous world (zones instead of levels)

Status legend: [x] done, [ ] todo. Update this file as you go.

## Plan (6 lines)
1. World floors = index 0..3 = B1, 1, 2, 3 at world y = index * FLOOR_H (FLOORS = 4). Yellow floors are the old
   generateFloor(seed, 0..2) re-indexed to 1..3, so their look is unchanged; B1 is the garage zone.
2. Garage generator is unchanged internally; `lib/world/garage-zone.ts` places it with origin (ox,oy,oz) =
   (-14, -1.3, -32.4) so its upper deck is y=0 (B1) and it sits under the building; colliders/spots/lights are offset.
3. B1 lobby (stairwell bottom door -> corridor -> elevator front -> doorway into the garage) and the vehicle ramp
   (F1 east wall door at z=46.5 -> outside corridor x 54..60 -> garage east wall at aisle z=12.6) are part of the garage zone.
4. `lib/world/zones.ts` = zone defs (env, sound, name) + portals; `lib/world/zone-manager.ts` = current zone, mounted
   set (current + neighbours near a portal, staggered one per few frames, 2+ away unmounted/disposed), env blending.
5. Player/interact/env/light rig read the world instead of LevelConfig. Stairwell + elevator get 4 floors (B1,1,2,3).
6. Level dropdown only with ?debug=1 (teleport to zone start); no per-level loading; Pool/Living plug in as zones later.

## World coordinates (meters)
- Yellow building: x 0..54, z 0..54, floors at y 3.4 / 6.8 / 10.2 (index 1..3). Stairwell x -6..0, z 24..32.
- Elevator shaft x 24..30, z 30..33 (front at z 29.9). Lobby on yellow floors is the old LOBBY.
- Garage (B1): local (0..68, 0..54) -> world x -14..54, z -32.4..21.6; lower deck y -1.3, upper deck y 0.
- B1 lobby: x 0..32, z 22..30, y 0..3, door into garage at x 26..28 (garage south wall z 21.6..22).
- Ramp: x 54.2..60.2; top landing z 45..48.5 (y 3.4), slope z 45 -> 24, bottom pad z 10.2..24 (y 0),
  garage east-wall door at z 11.6..13.6.

## Checklist
- [x] constants: FLOORS=4, YELLOW_FLOORS=3, FLOOR_NAMES
- [x] world-generator: opts { zone override (F3 = zone 1 tan/dark), extra east door (F1 ramp) }
- [x] garage-layout: opts { keepClear rects, wall openings } (look unchanged)
- [x] lib/world/garage-zone.ts (offset garage + lobby + ramp geometry data, colliders, ground)
- [x] lib/world/zones.ts + zone-manager.ts
- [x] store.ts: loadWorld(seed), teleportToZone(id)
- [x] player.tsx ground/collision from world
- [x] elevator (4 buttons, B1 facade concrete), interact labels, textures digits B1
- [x] components/world/garage-zone-scene.tsx, world-scene (mount/visibility), env blending, zone card
- [x] hud: dropdown only with ?debug=1, zone name card
- [x] Living Room brighter (2x ambient/lamps, larger fog far) — in its LevelConfig values
- [x] tsc passes
- [x] browser check: B1 lobby -> garage doorway, B1 elevator facade, stairwell bottom (B1) with fire door,
      ramp heights (bottom 0 / mid 1.7 / top 3.4) and ramp -> Floor 1 doorway, Floor 3 Zone B, debug teleport.
- [ ] Not measured yet: total draw calls with all visible zones (target ~100). Check with renderer.info in ?debug=1.

## How it works now (read before editing)
- `lib/backrooms/store.ts` `loadWorld(seed)` builds all CPU data (4 floors, hide spots, garage zone). No level switching.
- `lib/world/zone-manager.ts` `updateZones()` is called from Player every frame: current zone -> `ui.zone`
  (drives ZoneCard), env blend -> `zoneEnv` (read by LevelEnvironment + GarageLights), mounted set -> `ui.mounted`.
- `components/world/world-scene.tsx` mounts geometry per `ui.mounted`; unmount disposes (garage also disposes
  its textures/materials via `disposeGarage`). Light rigs stay mounted so the shader light count never changes.
- Player ground = stairs ?? ramp ?? garage decks (B1) ?? floor * FLOOR_H. Collision = stairwell + floors k-1..k+1.
- Debug: `?debug=1` shows the zone teleport dropdown and exposes `window.__game`; `&zone=garage` spawns there.
  Headless browsers run at a low FPS (dt is capped), so test by placing `__game.player` rather than walking.
- Old `levels/*` LevelConfigs + `levels/registry.ts` are no longer used by the game; their layouts/scenes are
  reused as zones (garage done). Level 3 values were brightened (2x ambient/lamps, fog far 17 -> 30).

## Next step: Pool + Living Room zones
1. Add `'pool'` / `'living'` to `ZoneId` + `ZONES` in `lib/world/zones.ts` (env from levels/level-2.ts / level-3.ts),
   neighbours `yellow-2` / `yellow-1`, and a `Portal` with `blend: true` at the archway / hallway mouth.
2. Extend `zoneAt(floor, x, z)` with the wing's x/z bounds.
3. Add `westDoors` (pool, Floor 2) / another `eastDoors` row (living, Floor 1, NOT row 15 = ramp) in `generateFloor` opts.
4. Place the generator output with an origin offset like `lib/world/garage-zone.ts` (offset colliders, spots, lights),
   and render the scene inside a `<group position>` like `GarageZoneScene`.
5. Wire `medium` (pool water) and `afterMove` (living room loop doors) in `components/backrooms/player.tsx` by zone.

## Next step (not this one)
- Pool wing west of Floor 2 via tiled archway; Living Room wing east of Floor 1 via long hallway
  (pick a z that is not the ramp door at z 46.5). Add each as a zone in `lib/world/zones.ts` with a portal.
