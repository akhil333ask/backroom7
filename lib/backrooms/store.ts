import { useSyncExternalStore } from 'react'
import { buildGarageZone, type GarageZoneData } from '@/lib/world/garage-zone'
import { ZONES, type ZoneId } from '@/lib/world/zones'
import { audio } from './audio'
import { resetBlackouts } from './blackouts'
import { CELL, FLOOR_H, FLOORS, LOBBY, STAIR, YELLOW_FLOORS } from './constants'
import { resetOccupancy, type HideSpot } from './hide-spot'
import { placeHideSpots, type HideSpotRules } from './hide-spot-placer'
import { resetPlayerState } from './player-store'
import { hashSeed, mulberry32 } from './rng'
import { resetWater } from './water-state'
import { CellType, generateFloor, type FloorData } from './world-generator'

/** Mutable per-frame state (read/written inside useFrame, never triggers React renders). */
export const game = {
  /** World floors: 0 = B1 garage, 1..3 = yellow floors. */
  floors: [] as FloorData[],
  hideSpots: [] as HideSpot[],
  /** Hide spot currently aimed at (drives the highlight). */
  highlight: null as HideSpot | null,
  worldSeed: 0,
  garage: null as GarageZoneData | null,
  player: { x: 0, z: 0, feet: 0, yaw: Math.PI, pitch: 0, bob: 0, speed: 0 },
  input: {
    keys: new Set<string>(),
    joyX: 0,
    joyY: 0,
    lookDX: 0,
    lookDY: 0,
    interactQueued: false,
  },
  shake: 0,
}

export const floorOf = (feet: number) => Math.max(0, Math.min(FLOORS - 1, Math.floor((feet + FLOOR_H * 0.3) / FLOOR_H)))

/** UI-facing state with subscriptions. */
export interface UiState {
  seed: number
  floor: number
  /** Zone the player is in (drives the corner card). */
  zone: ZoneId
  /** Zones whose geometry is currently built (current + nearby neighbours). */
  mounted: ZoneId[]
  muted: boolean
  started: boolean
  locked: boolean
  isTouch: boolean
  target: string | null
  /** Found-footage camcorder look (overlay, fisheye, low-res). */
  footage: boolean
}

let ui: UiState = {
  seed: 0,
  floor: 1,
  zone: 'yellow-1',
  mounted: [],
  muted: false,
  started: false,
  locked: false,
  isTouch: false,
  target: null,
  footage: true,
}
const listeners = new Set<() => void>()

export function setUi(patch: Partial<UiState>) {
  let changed = false
  for (const k in patch) {
    const key = k as keyof UiState
    if (ui[key] !== patch[key]) changed = true
  }
  if (!changed) return
  ui = { ...ui, ...patch }
  listeners.forEach((l) => l())
}

export const getUi = () => ui

export function useUi<T>(selector: (s: UiState) => T): T {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => selector(ui),
    () => selector(ui),
  )
}

/** Ramp doorway on Floor 1's east wall (cell row). Matches RAMP.topDoorZ in lib/world/garage-zone.ts. */
const RAMP_DOOR_ROW = 15

const YELLOW_RULES: HideSpotRules = {
  minPerFloor: 28,
  minSpacing: 3.2,
  sectors: 6,
  weights: { desk: 3, locker: 3, partition: 2, closet: 3, vent: 3, pillar: 1 },
  keepOut: [
    // Elevator lobby + shaft
    { x0: LOBBY.cx0 * CELL, z0: LOBBY.cz0 * CELL, x1: (LOBBY.cx1 + 1) * CELL, z1: (LOBBY.cz1 + 2) * CELL },
    // Straight corridor from the stairwell door to the lobby
    { x0: 0, z0: STAIR.doorCell.cz * CELL, x1: LOBBY.cx0 * CELL, z1: (STAIR.doorCell.cz + 1) * CELL },
    // In front of the ramp doorway
    { x0: 50, z0: RAMP_DOOR_ROW * CELL - 1, x1: 54, z1: (RAMP_DOOR_ROW + 1) * CELL + 1 },
  ],
  wallCells: [CellType.Normal, CellType.Hall, CellType.Room],
  openCells: [CellType.Hall],
}

/**
 * Builds the whole world from one seed (pure: identical seed => identical world, needed for 1v1 sync).
 * Only CPU data is generated here; GPU geometry is built lazily per zone by the scene.
 */
export function loadWorld(seed: number, startZone: ZoneId = 'yellow-1') {
  resetPlayerState()
  resetOccupancy()
  resetWater()
  game.highlight = null

  const worldSeed = hashSeed(seed, 0x0b1d)
  const yellow = Array.from({ length: YELLOW_FLOORS }, (_, k) => {
    const f = generateFloor(worldSeed, k, {
      zone: k === 2 ? 1 : undefined,
      eastDoors: k === 0 ? [RAMP_DOOR_ROW] : undefined,
    })
    f.index = k + 1
    return f
  })
  const garage = buildGarageZone(hashSeed(worldSeed, 0x6a7a))
  game.garage = garage
  game.floors = [garage.floor, ...yellow]
  game.hideSpots = [
    ...garage.hideSpots,
    ...yellow.flatMap((f, i) => placeHideSpots(f, YELLOW_RULES, mulberry32(hashSeed(worldSeed, i, 0x41de5)))),
  ]
  game.worldSeed = worldSeed

  resetBlackouts(worldSeed)
  audio.configure(ZONES[startZone].env.ambientSound)
  setUi({ seed })
  teleportToZone(startZone)
}

/** Debug (?debug=1): jump to a zone's start point. Also used for the initial spawn. */
export function teleportToZone(id: ZoneId) {
  const s = ZONES[id].start
  const p = game.player
  p.x = s.x
  p.z = s.z
  p.feet = s.floor * FLOOR_H
  p.yaw = s.yaw
  p.pitch = 0
  setUi({ floor: s.floor, zone: id, mounted: [id] })
}

export const randomSeed = () => 1000 + Math.floor(Math.random() * 9000)
