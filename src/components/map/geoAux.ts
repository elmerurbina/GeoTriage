// Geometrías auxiliares de demostración: lagos y graticula.
// Formas esquemáticas con fines visuales, no cartográficos exactos.

export const LAKES_GEOJSON = {
  type: 'FeatureCollection' as const,
  features: [
    {
      type: 'Feature' as const,
      properties: { name: 'Lago de Managua (Xolotlán) — esquema' },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [
          [
            [-86.45, 12.22],
            [-86.3, 12.32],
            [-86.1, 12.34],
            [-85.95, 12.25],
            [-85.9, 12.15],
            [-86.05, 12.08],
            [-86.25, 12.06],
            [-86.4, 12.12],
            [-86.45, 12.22],
          ],
        ],
      },
    },
    {
      type: 'Feature' as const,
      properties: { name: 'Lago de Cocibolca — esquema' },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [
          [
            [-85.45, 11.55],
            [-85.3, 11.75],
            [-85.15, 11.95],
            [-85.05, 12.1],
            [-84.95, 12.2],
            [-84.88, 12.1],
            [-84.92, 11.9],
            [-85.0, 11.7],
            [-85.1, 11.5],
            [-85.25, 11.4],
            [-85.4, 11.45],
            [-85.45, 11.55],
          ],
        ],
      },
    },
  ],
}

/** Genera líneas de graticula cada 1° sobre el bounding box de Nicaragua. */
export function buildGraticule() {
  const lines: number[][][] = []
  for (let lng = -88; lng <= -83; lng++) {
    lines.push([
      [lng, 10.4],
      [lng, 15.4],
    ])
  }
  for (let lat = 10; lat <= 16; lat++) {
    lines.push([
      [-88.2, lat],
      [-82.8, lat],
    ])
  }
  return {
    type: 'FeatureCollection' as const,
    features: lines.map((c) => ({
      type: 'Feature' as const,
      properties: {},
      geometry: { type: 'LineString' as const, coordinates: c },
    })),
  }
}

export const NIC_BBOX = { minLng: -87.9, maxLng: -82.9, minLat: 10.5, maxLat: 15.3 }
export const NIC_CENTER: [number, number] = [-85.4, 12.8]
