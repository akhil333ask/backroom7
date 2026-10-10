import type { AmbienceKind } from '@/levels/types'
import { CELL, ELEV, FLOOR_H, LOBBY, STAIR } from '@/lib/backrooms/constants'
import { LOBBY_B1, RAMP } from './garage-zone'

export type ZoneId = 'garage' | 'yellow-1' | 'yellow-2' | 'yellow-3'

export interface ZoneEnv {
  fog: { color: string; near: number; far: number }
  ambient: { skyColor: string; groundColor: string; hemiIntensity: number; color: string; intensity: number }
  lightStyle: { color: string; intensity: number; blackoutAmbient: number }
  ambientSound: { humBase: number; humRange: number; buzzGain: number }
  ambience: AmbienceKind | null
}

export interface ZoneDef {
  id: ZoneId
  /** Corner card: small title + big subtitle. */
  title: string
  name: string
  floor: number
  env: ZoneEnv
  /** Zones reachable through a doorway / stairs / ramp. Render + collision set = current + these. */
  neighbors: ZoneId[]
  start: { floor: number; x: number; z: number; yaw: number }
}

const YELLOW_ENV: ZoneEnv = {
  fog: { color: '#9d9462', near: 8, far: 62 },
  ambient: { skyColor: '#fff8dc', groundColor: '#a0925a', hemiIntensity: 1.25, color: '#fff2c8', intensity: 0.35 },
  lightStyle: { color: '#fff4d2', intensity: 3.6, blackoutAmbient: 0.3 },
  ambientSound: { humBase: 0.025, humRange: 0.11, buzzGain: 0.025 },
  ambience: null,
}

const ZONE_B_ENV: ZoneEnv = {
  ...YELLOW_ENV,
  fog: { color: '#6f6744', near: 6, far: 48 },
  ambient: { skyColor: '#e9dcb0', groundColor: '#7d6f42', hemiIntensity: 0.95, color: '#e6d3a4', intensity: 0.26 },
  lightStyle: { color: '#ffe9bf', intensity: 3.1, blackoutAmbient: 0.25 },
}

const GARAGE_ENV: ZoneEnv = {
  fog: { color: '#1b201c', near: 1.5, far: 21 },
  ambient: { skyColor: '#5d665c', groundColor: '#2a2823', hemiIntensity: 0.22, color: '#8a9484', intensity: 0.06 },
  lightStyle: { color: '#d6e6cc', intensity: 6, blackoutAmbient: 0.15 },
  ambientSound: { humBase: 0.012, humRange: 0.05, buzzGain: 0.03 },
  ambience: 'garage',
}

const lobbyStart = (floor: number) => ({
  floor,
  x: ((LOBBY.cx0 + LOBBY.cx1 + 1) / 2) * CELL,
  z: (LOBBY.cz0 + 1.5) * CELL,
  yaw: Math.PI,
})

export const ZONES: Record<ZoneId, ZoneDef> = {
  garage: {
    id: 'garage',
    title: 'B1',
    name: 'The Garage',
    floor: 0,
    env: GARAGE_ENV,
    neighbors: ['yellow-1'],
    start: { floor: 0, x: LOBBY_B1.doorX, z: LOBBY_B1.z0 + 2.5, yaw: 0 },
  },
  'yellow-1': {
    id: 'yellow-1',
    title: 'Floor 1',
    name: 'The Yellow Rooms',
    floor: 1,
    env: YELLOW_ENV,
    neighbors: ['garage', 'yellow-2'],
    start: lobbyStart(1),
  },
  'yellow-2': {
    id: 'yellow-2',
    title: 'Floor 2',
    name: 'The Yellow Rooms',
    floor: 2,
    env: YELLOW_ENV,
    neighbors: ['yellow-1', 'yellow-3'],
    start: lobbyStart(2),
  },
  'yellow-3': {
    id: 'yellow-3',
    title: 'Floor 3',
    name: 'Zone B',
    floor: 3,
    env: ZONE_B_ENV,
    neighbors: ['yellow-2'],
    start: lobbyStart(3),
  },
}

export const ZONE_IDS = Object.keys(ZONES) as ZoneId[]

/** Which zone owns this point. Wings (pool, living room) will add x/z regions here. */
export function zoneAt(floor: number, _x: number, _z: number): ZoneId {
  if (floor <= 0) return 'garage'
  return `yellow-${Math.min(3, floor)}` as ZoneId
}

export const zoneOnFloor = (floor: number) => zoneAt(floor, 0, 0)

/**
 * A doorway between two zones. Used to lazily mount the far side when the player is within
 * MOUNT_RANGE, and (when `blend`) to crossfade fog/ambient/sound within BLEND_RANGE.
 * Vertical connectors (stairwell, ramp) blend by height instead, see zone-manager.
 */
export interface Portal {
  a: ZoneId
  b: ZoneId
  x: number
  y: number
  z: number
  blend?: boolean
}

const stairDoor = (floor: number) => ({ x: STAIR.x1 - 0.5, y: floor * FLOOR_H, z: (STAIR.doorZ0 + STAIR.doorZ1) / 2 })
const elevDoor = (floor: number) => ({ x: ELEV.x, y: floor * FLOOR_H, z: ELEV.frontZ0 - 0.6 })

export const PORTALS: Portal[] = [
  ...[0, 1, 2].flatMap((k) => {
    const a = zoneOnFloor(k)
    const b = zoneOnFloor(k + 1)
    return [
      { a, b, ...stairDoor(k) },
      { a, b, ...stairDoor(k + 1) },
      { a, b, ...elevDoor(k) },
      { a, b, ...elevDoor(k + 1) },
    ]
  }),
  { a: 'yellow-1', b: 'garage', x: RAMP.x0, y: RAMP.rise, z: RAMP.topDoorZ },
  { a: 'yellow-1', b: 'garage', x: RAMP.x0, y: 0, z: RAMP.bottomDoorZ },
]

export const MOUNT_RANGE = 15
export const BLEND_RANGE = 6
