import { sampleImageDataGrid } from './pixel-processor'
import { applyColorFilter } from './color-filter'
import type { AsciiConfig, AsciiGrid } from '../types'

export function convertToBitmap(
  imageData: ImageData,
  config: AsciiConfig
): AsciiGrid {
  const { width, height } = imageData
  const aspect = width / height
  const targetCols = Math.max(20, Math.round(100 * config.density * (aspect > 1 ? aspect : 1)))
  const targetRows = Math.max(10, Math.round(targetCols / aspect * 0.55))

  const { lum, r, g, b } = sampleImageDataGrid(imageData, targetCols, targetRows)
  const grid: AsciiGrid = []

  const NBSP = '\u00A0'

  for (let row = 0; row < targetRows; row++) {
    const gridRow = []
    for (let col = 0; col < targetCols; col++) {
      const idx = row * targetCols + col
      let l = lum[idx] * config.brightness
      l = Math.max(0, Math.min(1, l))
      if (config.contrast !== 1) {
        const factor = (259 * (config.contrast * 127 + 127)) / (255 * (259 - (config.contrast * 127 + 127)))
        l = Math.max(0, Math.min(1, factor * (l - 0.128) + 0.128))
      }
      // Bitmap ignores charset and invert — uses NBSP as placeholder
      const [cr, cg, cb] = applyColorFilter(idx, l, r[idx], g[idx], b[idx], config.colorEnabled, config.colorFilterId)
      gridRow.push({ char: NBSP, r: cr, g: cg, b: cb })
    }
    grid.push(gridRow)
  }

  return grid
}
