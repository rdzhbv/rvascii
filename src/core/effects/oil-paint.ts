import { applyColorFilter } from '../color-filter'
import type { AsciiConfig, AsciiGrid } from '../../types'

const NBSP = '\u00A0'

export function processOilPaint(imageData: ImageData, config: AsciiConfig): AsciiGrid {
  const { width, height, data } = imageData
  const aspect = width / height
  const targetCols = Math.max(20, Math.round(100 * config.density * (aspect > 1 ? aspect : 1)))
  const targetRows = Math.max(10, Math.round(targetCols / aspect * 0.55))

  const radius = Math.max(1, Math.round(config.oilPaintRadius))
  const levels = 8

  const xStep = width / targetCols
  const yStep = height / targetRows

  const grid: AsciiGrid = []

  for (let row = 0; row < targetRows; row++) {
    const gridRow = []
    for (let col = 0; col < targetCols; col++) {
      const cx = Math.min(Math.floor(col * xStep), width - 1)
      const cy = Math.min(Math.floor(row * yStep), height - 1)

      // Oil paint: histogram of luminance bins within radius
      const histogram = new Int32Array(levels)
      const avgR = new Float32Array(levels)
      const avgG = new Float32Array(levels)
      const avgB = new Float32Array(levels)

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const px = Math.max(0, Math.min(width - 1, cx + dx))
          const py = Math.max(0, Math.min(height - 1, cy + dy))
          const idx = (py * width + px) * 4
          const pr = data[idx], pg = data[idx + 1], pb = data[idx + 2]
          const l = (0.299 * pr + 0.587 * pg + 0.114 * pb) / 255
          const bin = Math.min(levels - 1, Math.floor(l * levels))
          histogram[bin]++
          avgR[bin] += pr
          avgG[bin] += pg
          avgB[bin] += pb
        }
      }

      // Find dominant luminance bin
      let maxBin = 0
      let maxCount = 0
      for (let i = 0; i < levels; i++) {
        if (histogram[i] > maxCount) {
          maxCount = histogram[i]
          maxBin = i
        }
      }

      const domR = maxCount > 0 ? Math.round(avgR[maxBin] / maxCount) : 0
      const domG = maxCount > 0 ? Math.round(avgG[maxBin] / maxCount) : 0
      const domB = maxCount > 0 ? Math.round(avgB[maxBin] / maxCount) : 0
      const lum = maxCount > 0 ? (maxBin + 0.5) / levels : 0

      const [cr, cg, cb] = applyColorFilter(row * targetCols + col, lum, domR, domG, domB, config.colorEnabled, config.colorFilterId)
      gridRow.push({ char: NBSP, r: cr, g: cg, b: cb })
    }
    grid.push(gridRow)
  }

  return grid
}
