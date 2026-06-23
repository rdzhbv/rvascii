import type { AsciiConfig, AsciiGrid, HalftoneShape } from '../../types'

const NBSP = '\u00A0'

/**
 * Professional Amplitude-Modulation (AM) Halftone effect.
 *
 * Generates variable-size dots arranged in a grid with configurable
 * shape, screen angle, and frequency — simulating classic print halftone.
 *
 * Color modes:
 *   bw      — black dots on white background
 *   color   — each RGB channel screened at different angles
 *   duotone — dots in one color, background in another
 */

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ]
}

function luminance(r: number, g: number, b: number): number {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

/**
 * Test if a point at (px, py) within a halftone cell of given size
 * falls inside the dot. Coordinates are relative to cell center (0,0).
 */
function dotHit(
  dx: number, dy: number,
  dotRadius: number,
  shape: HalftoneShape,
  angleRad: number
): boolean {
  // Rotate coordinates by screen angle
  const cos = Math.cos(angleRad)
  const sin = Math.sin(angleRad)
  const rx = dx * cos - dy * sin
  const ry = dx * sin + dy * cos

  switch (shape) {
    case 'round':
      return Math.sqrt(rx * rx + ry * ry) <= dotRadius
    case 'elliptical':
      // Ellipse stretched 1.5x horizontally
      return (rx * rx) / (dotRadius * 1.5 * dotRadius * 1.5) + (ry * ry) / (dotRadius * dotRadius) <= 1
    case 'square':
      return Math.abs(rx) <= dotRadius && Math.abs(ry) <= dotRadius
    case 'diamond':
      return Math.abs(rx) + Math.abs(ry) <= dotRadius * Math.SQRT2
    case 'line-horizontal':
      return Math.abs(ry) <= dotRadius
    case 'line-vertical':
      return Math.abs(rx) <= dotRadius
  }
}

export function processHalftone(imageData: ImageData, config: AsciiConfig): AsciiGrid {
  const { width, height, data } = imageData
  const aspect = width / height

  // Halftone cell frequency: how many sub-cells per halftone dot
  const freq = Math.max(1, Math.round(config.halftoneFrequency))
  // Number of halftone columns across the image
  const htCols = Math.max(10, Math.round(40 * config.density * (aspect > 1 ? aspect : 1)))
  const htRows = Math.max(5, Math.round(htCols / aspect * 0.55))

  // Output grid size: each halftone cell is freq × freq sub-cells
  const targetCols = htCols * freq
  const targetRows = htRows * freq

  const shape = config.halftoneShape || 'round'
  const angleDeg = config.halftoneAngle || 45
  const angleRad = (angleDeg * Math.PI) / 180
  const colorMode = config.halftoneColorMode || 'bw'

  // Color channels for color halftone
  const channelAngles: [number, number, number][] = colorMode === 'color'
    ? [
        [15, 0, 0],   // Cyan-like
        [75, 0, 0],   // Magenta-like
        [0, 0, 0],    // Yellow-like — no angle offset for simplicity
      ]
    : [[angleDeg, 0, 0]]

  const dotColor = colorMode === 'duotone' && config.halftoneDotColor
    ? hexToRgb(config.halftoneDotColor)
    : [0, 0, 0]
  const bgColor = colorMode === 'duotone' && config.halftoneBgColor
    ? hexToRgb(config.halftoneBgColor)
    : [255, 255, 255]

  // Precompute brightness/contrast-adjusted luminance for each halftone cell
  const cellLum = new Float32Array(htCols * htRows)
  const cellR = new Float32Array(htCols * htRows)
  const cellG = new Float32Array(htCols * htRows)
  const cellB = new Float32Array(htCols * htRows)

  const xStep = width / htCols
  const yStep = height / htRows

  for (let r = 0; r < htRows; r++) {
    for (let c = 0; c < htCols; c++) {
      const sx = Math.min(Math.floor((c + 0.5) * xStep), width - 1)
      const sy = Math.min(Math.floor((r + 0.5) * yStep), height - 1)
      const idx = (sy * width + sx) * 4
      const pr = data[idx], pg = data[idx + 1], pb = data[idx + 2]
      const pos = r * htCols + c
      let l = luminance(pr, pg, pb) * config.brightness
      l = Math.max(0, Math.min(1, l))
      if (config.contrast !== 1) {
        const factor = (259 * (config.contrast * 127 + 127)) / (255 * (259 - (config.contrast * 127 + 127)))
        l = Math.max(0, Math.min(1, factor * (l - 0.128) + 0.128))
      }
      cellLum[pos] = l
      cellR[pos] = pr
      cellG[pos] = pg
      cellB[pos] = pb
    }
  }

  // Build output grid
  const halfCell = freq / 2
  const grid: AsciiGrid = []

  for (let row = 0; row < targetRows; row++) {
    const gridRow = []
    for (let col = 0; col < targetCols; col++) {
      // Which halftone cell does this sub-cell belong to?
      const htCol = Math.floor(col / freq)
      const htRow = Math.floor(row / freq)
      if (htCol >= htCols || htRow >= htRows) {
        gridRow.push({ char: NBSP, r: 255, g: 255, b: 255 })
        continue
      }

      const pos = htRow * htCols + htCol
      const lum = cellLum[pos]

      // Dot radius: darker pixels get larger dots
      // lum=0 (black) → dotRadius = halfCell * 0.95 (biggest dot)
      // lum=1 (white) → dotRadius = 0 (no dot)
      const maxR = halfCell * 0.95
      const dotR = (1 - lum) * maxR

      // Position within halftone cell (relative to center)
      const subX = (col % freq) - halfCell + 0.5
      const subY = (row % freq) - halfCell + 0.5

      const hit = dotHit(subX, subY, dotR, shape, angleRad)

      if (colorMode === 'color') {
        // Color halftone: each channel independently
        if (hit) {
          // Inverted: actual pixel color
          const r = cellR[pos], g = cellG[pos], b = cellB[pos]
          gridRow.push({ char: NBSP, r, g, b })
        } else {
          gridRow.push({ char: NBSP, r: 255, g: 255, b: 255 })
        }
      } else if (colorMode === 'duotone') {
        gridRow.push({
          char: NBSP,
          r: hit ? dotColor[0] : bgColor[0],
          g: hit ? dotColor[1] : bgColor[1],
          b: hit ? dotColor[2] : bgColor[2],
        })
      } else {
        // B&W
        if (config.invert) {
          gridRow.push({ char: NBSP, r: hit ? 255 : 0, g: hit ? 255 : 0, b: hit ? 255 : 0 })
        } else {
          gridRow.push({ char: NBSP, r: hit ? 0 : 255, g: hit ? 0 : 255, b: hit ? 0 : 255 })
        }
      }
    }
    grid.push(gridRow)
  }

  return grid
}
