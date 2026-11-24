// Render budgets for the Dock scene. Kept apart from dock-scene.tsx so importing
// them does not pull three.js into the initial bundle.

export interface SceneQuality {
  /** Ocean grid resolution per side. */
  oceanSegments: number
  coins: number
  dpr: [number, number]
  outlines: boolean
}

export const QUALITY_HIGH: SceneQuality = {
  oceanSegments: 140,
  coins: 12,
  dpr: [1, 1.75],
  outlines: true,
}
export const QUALITY_LOW: SceneQuality = {
  oceanSegments: 56,
  coins: 6,
  dpr: [1, 1.5],
  outlines: true,
}
