import { applyColorFilter } from '../color-filter'
import type { AsciiConfig, AsciiGrid } from '../../types'

const NBSP = '\u00A0'

export function processDither(imageData: ImageData, config: AsciiConfig): AsciiGrid {
  const { width, height, data } = imageData
  const aspect = width / height
  const targetCols = Math.max(20, Math.round(100 * config.density * (aspect > 1 ? aspect : 1)))
  const targetRows = Math.max(10, Math.round(targetCols / aspect * 0.55))

  // Build full-size grayscale + color arrays, then dither at target resolution
  const gray = new Float32Array(width * height)
  const rArr = new Float32Array(width * height)
  const gArr = new Float32Array(width * height)
  const bArr = new Float32Array(width * height)
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4
    gray[i] = (0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]) / 255
    rArr[i] = data[idx]
    gArr[i] = data[idx + 1]
    bArr[i] = data[idx + 2]
  }

  const xStep = width / targetCols
  const yStep = height / targetRows

  // Sampled luminance (before dither)
  const sampledLum = new Float32Array(targetCols * targetRows)
  const sampledR = new Float32Array(targetCols * targetRows)
  const sampledG = new Float32Array(targetCols * targetRows)
  const sampledB = new Float32Array(targetCols * targetRows)

  for (let r = 0; r < targetRows; r++) {
    for (let c = 0; c < targetCols; c++) {
      const sx = Math.min(Math.floor(c * xStep), width - 1)
      const sy = Math.min(Math.floor(r * yStep), height - 1)
      const idx = sy * width + sx
      sampledLum[r * targetCols + c] = gray[idx]
      sampledR[r * targetCols + c] = rArr[idx]
      sampledG[r * targetCols + c] = gArr[idx]
      sampledB[r * targetCols + c] = bArr[idx]
    }
  }

  const grid: AsciiGrid = []

  if (config.ditherAlgorithm === 'bayer') {
    // Bayer 4x4 threshold matrix
    const BAYER: number[] = [
      0/16, 8/16, 2/16, 10/16,
      12/16, 4/16, 14/16, 6/16,
      3/16, 11/16, 1/16, 9/16,
      15/16, 7/16, 13/16, 5/16,
    ]

    for (let row = 0; row < targetRows; row++) {
      const gridRow = []
      for (let col = 0; col < targetCols; col++) {
        const idx = row * targetCols + col
        let l = sampledLum[idx] * config.brightness
        l = Math.max(0, Math.min(1, l))
        if (config.contrast !== 1) {
          const factor = (259 * (config.contrast * 127 + 127)) / (255 * (259 - (config.contrast * 127 + 127)))
          l = Math.max(0, Math.min(1, factor * (l - 0.128) + 0.128))
        }

        const bx = col % 4, by = row % 4
        const threshold = BAYER[by * 4 + bx]
        const isBlack = l < threshold

        const [cr, cg, cb] = isBlack
          ? [0, 0, 0]
          : applyColorFilter(idx, l, sampledR[idx], sampledG[idx], sampledB[idx], config.colorEnabled, config.colorFilterId)

        gridRow.push({ char: NBSP, r: cr, g: cg, b: cb })
      }
      grid.push(gridRow)
    }
  } else {
    // Floyd-Steinberg error diffusion (on the sampled grid)
    const error = new Float32Array(targetCols * targetRows)
    for (let i = 0; i < error.length; i++) {
      let l = sampledLum[i] * config.brightness
      l = Math.max(0, Math.min(1, l))
      if (config.contrast !== 1) {
        const factor = (259 * (config.contrast * 127 + 127)) / (255 * (259 - (config.contrast * 127 + 127)))
        l = Math.max(0, Math.min(1, factor * (l - 0.128) + 0.128))
      }
      error[i] = l
    }

    for (let row = 0; row < targetRows; row++) {
      const gridRow = []
      for (let col = 0; col < targetCols; col++) {
        const idx = row * targetCols + col
        const oldPixel = error[idx]
        const newPixel = oldPixel > 0.5 ? 1 : 0
        const quantError = oldPixel - newPixel

        error[idx] = newPixel

        // Distribute error
        if (col + 1 < targetCols) error[idx + 1] += quantError * (7 / 16)
        if (row + 1 < targetRows) {
          if (col > 0) error[idx + targetCols - 1] += quantError * (3 / 16)
          error[idx + targetCols] += quantError * (5 / 16)
          if (col + 1 < targetCols) error[idx + targetCols + 1] += quantError * (1 / 16)
        }

        const isBlack = newPixel === 0
        const [cr, cg, cb] = isBlack
          ? [0, 0, 0]
          : applyColorFilter(idx, oldPixel, sampledR[idx], sampledG[idx], sampledB[idx], config.colorEnabled, config.colorFilterId)

        gridRow.push({ char: NBSP, r: cr, g: cg, b: cb })
      }
      grid.push(gridRow)
    }
  }

  return grid
}
