'use client'

import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { CEIL_H, CELL, DOOR_H, LOBBY, STAIR } from '@/lib/backrooms/constants'
import { BoxBatch, type BoxSpec } from '@/lib/backrooms/geometry'
import { getMaterials } from '@/lib/backrooms/materials'
import { buildStairwell } from '@/lib/backrooms/stairs'

function batch(specs: BoxSpec[], texW = 1, texH = 1) {
  const b = new BoxBatch(texW, texH)
  specs.forEach((s) => b.add(s))
  return b.build()
}

const DOOR_W = STAIR.doorZ1 - STAIR.doorZ0
const WALL_X = STAIR.x1 - 0.15

export function Stairwell() {
  const mats = getMaterials()
  const data = useMemo(() => {
    const s = buildStairwell()
    const doors: BoxSpec[] = []
    const frames: BoxSpec[] = []
    const lamps: BoxSpec[] = []
    const signs: { x: number; y: number; z: number; ry: number }[] = []
    for (const d of s.doors) {
      const y = d.y
      // Fire door swung open against the stairwell wall, hinged at doorZ0.
      doors.push({ p: [WALL_X - 0.08 - DOOR_W / 2, y + DOOR_H / 2 - 0.03, STAIR.doorZ0 + 0.04], s: [DOOR_W - 0.04, DOOR_H - 0.06, 0.05] })
      frames.push(
        { p: [WALL_X - 0.08 - DOOR_W * 0.55, y + 1.0, STAIR.doorZ0 + 0.1], s: [DOOR_W * 0.6, 0.04, 0.05] },
        { p: [WALL_X - 0.06, y + DOOR_H / 2, STAIR.doorZ0 + 0.03], s: [0.08, DOOR_H, 0.06] },
        { p: [WALL_X - 0.06, y + DOOR_H / 2, STAIR.doorZ1 - 0.03], s: [0.08, DOOR_H, 0.06] },
        { p: [WALL_X - 0.06, y + DOOR_H + 0.03, (STAIR.doorZ0 + STAIR.doorZ1) / 2], s: [0.08, 0.06, DOOR_W] },
      )
      signs.push(
        { x: WALL_X - 0.07, y: y + DOOR_H + 0.25, z: (STAIR.doorZ0 + STAIR.doorZ1) / 2, ry: -Math.PI / 2 },
        { x: 0.115, y: y + DOOR_H + 0.25, z: (STAIR.doorZ0 + STAIR.doorZ1) / 2, ry: Math.PI / 2 },
      )
      // Hanging double-sided EXIT signs along the corridor from the lobby
      const corridorZ = (STAIR.doorCell.cz + 0.5) * CELL
      for (const sx of [LOBBY.cx0 * CELL, (LOBBY.cx0 * CELL) / 2]) {
        lamps.push({ p: [sx, y + CEIL_H - 0.12, corridorZ], s: [0.04, 0.24, 0.04] })
        frames.push({ p: [sx, y + CEIL_H - 0.33, corridorZ], s: [0.03, 0.18, 0.44] })
        signs.push(
          { x: sx + 0.02, y: y + CEIL_H - 0.33, z: corridorZ, ry: Math.PI / 2 },
          { x: sx - 0.02, y: y + CEIL_H - 0.33, z: corridorZ, ry: -Math.PI / 2 },
        )
      }
    }
    for (const l of s.lights) lamps.push({ p: [l.x, l.y, l.z], s: [0.9, 0.05, 0.25] })
    return {
      concrete: batch(s.concrete, 2, 2),
      walls: batch(s.walls, 3, 3),
      rails: batch(s.rails),
      doors: batch(doors),
      frames: batch(frames),
      lamps: batch(lamps),
      signs,
      signGeo: new THREE.PlaneGeometry(0.4, 0.15),
    }
  }, [])

  useEffect(
    () => () => {
      for (const g of [data.concrete, data.walls, data.rails, data.doors, data.frames, data.lamps, data.signGeo]) g?.dispose()
    },
    [data],
  )

  return (
    <group>
      {data.concrete && <mesh geometry={data.concrete} material={mats.concrete} />}
      {data.walls && <mesh geometry={data.walls} material={mats.paintedConcrete} />}
      {data.rails && <mesh geometry={data.rails} material={mats.rail} />}
      {data.doors && <mesh geometry={data.doors} material={mats.fireDoor} />}
      {data.frames && <mesh geometry={data.frames} material={mats.props.darkMetal} />}
      {data.lamps && <mesh geometry={data.lamps} material={mats.panel} />}
      {data.signs.map((s, i) => (
        <mesh key={i} geometry={data.signGeo} material={mats.exit} position={[s.x, s.y, s.z]} rotation={[0, s.ry, 0]} />
      ))}
    </group>
  )
}
