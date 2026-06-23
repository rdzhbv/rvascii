import { applyColorFilter } from '../color-filter'
import type { AsciiConfig, AsciiGrid } from '../../types'

const NBSP = '\u00A0'

export function processWave(imageData: ImageData, config: AsciiConfig): AsciiGrid {
  const { width, height, data } = imageData
  const aspect = width / height
  const targetCols = Math.max(20, Math.round(100 * config.density * (aspect > 1 ? aspect : 1)))
  const targetRows = Math.max(10, Math.round(targetCols / aspect * 0.55))

  const amplitude = config.waveAmplitude * width  // wave displacement in pixels
  const frequency = config.waveFrequency

  const grid: AsciiGrid = []

  for (let row = 0; row < targetRows; row++) {
    const gridRow = []
    for (let col = 0; col < targetCols; col++) {
      const nx = col / targetCols
      const ny = row / targetRows

      // Wave displacement
      const dx = Math.sin(ny * frequency * Math.PI * 2) * amplitude
      const dy = Math.cos(nx * frequency * Math.PI * 2) * amplitude

      const sx = Math.min(Math.floor((nx * width) + dx), width - 1)
      const sy = Math.min(Math.floor((ny * height) + dy), height - 1)

      const idx = (Math.max(0, sy) * width + Math.max(0, sx)) * 4
      const pr = data[idx], pg = data[idx + 1], pb = data[idx + 2]
      const l = ((0.299 * pr + 0.587 * pg + 0.114 * pb) / 255) * config.brightness

      let lum = Math.max(0, Math.min(1, l))
      if (config.contrast !== 1) {
        const factor = (259 * (config.contrast * 127 + 127)) / (255 * (259 - (config.contrast * 127 + 127)))
        lum = Math.max(0, Math.min(1, factor * (lum - 0.128) + 0.128))
      }

      const [cr, cg, cb] = applyColorFilter(row * targetCols + col, lum, pr, pg, pb, config.colorEnabled, config.colorFilterId)
      gridRow.push({ char: NBSP, r: cr, g: cg, b: cb })
    }
    grid.push(gridRow)
  }

  return grid
}
