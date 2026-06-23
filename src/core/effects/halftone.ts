import { applyColorFilter } from '../color-filter'
import type { AsciiConfig, AsciiGrid } from '../../types'

// Halftone dot characters from empty to full
const DOT_CHARS = ' ○◔◑◕●'

export function processHalftone(imageData: ImageData, config: AsciiConfig): AsciiGrid {
  const { width, height, data } = imageData
  const aspect = width / height
  const dotScale = config.halftoneDotSize

  // Halftone uses larger cells (lower resolution) to make dots visible
  const targetCols = Math.max(10, Math.round(60 * config.density * dotScale * (aspect > 1 ? aspect : 1)))
  const targetRows = Math.max(5, Math.round(targetCols / aspect * 0.55))

  const cellW = width / targetCols
  const cellH = height / targetRows

  const grid: AsciiGrid = []

  for (let row = 0; row < targetRows; row++) {
    const gridRow = []
    for (let col = 0; col < targetCols; col++) {
      // Average luminance + color over the cell
      const startX = Math.floor(col * cellW)
      const startY = Math.floor(row * cellH)
      const endX = Math.min(Math.ceil((col + 1) * cellW), width)
      const endY = Math.min(Math.ceil((row + 1) * cellH), height)

      let sumL = 0, sumR = 0, sumG = 0, sumB = 0
      let count = 0
      for (let py = startY; py < endY; py++) {
        for (let px = startX; px < endX; px++) {
          const idx = (py * width + px) * 4
          sumR += data[idx]
          sumG += data[idx + 1]
          sumB += data[idx + 2]
          sumL += (0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]) / 255
          count++
        }
      }

      let l = (sumL / count) * config.brightness
      l = Math.max(0, Math.min(1, l))
      if (config.contrast !== 1) {
        const factor = (259 * (config.contrast * 127 + 127)) / (255 * (259 - (config.contrast * 127 + 127)))
        l = Math.max(0, Math.min(1, factor * (l - 0.128) + 0.128))
      }

      const avgR = Math.round(sumR / count)
      const avgG = Math.round(sumG / count)
      const avgB = Math.round(sumB / count)

      // Map luminance to dot character
      const ci = Math.round(l * (DOT_CHARS.length - 1))
      const char = DOT_CHARS[Math.max(0, Math.min(DOT_CHARS.length - 1, ci))]

      const [cr, cg, cb] = applyColorFilter(row * targetCols + col, l, avgR, avgG, avgB, config.colorEnabled, config.colorFilterId)

      gridRow.push({ char, r: cr, g: cg, b: cb })
    }
    grid.push(gridRow)
  }

  return grid
}
