import { sampleImageDataGrid } from '../pixel-processor'
import { applyColorFilter } from '../color-filter'
import type { AsciiConfig, AsciiGrid } from '../../types'

const EDGE_CHARS = ' ··:+*#█'

export function processEdgeDetect(imageData: ImageData, config: AsciiConfig): AsciiGrid {
  const { width, height } = imageData
  const aspect = width / height
  const targetCols = Math.max(20, Math.round(100 * config.density * (aspect > 1 ? aspect : 1)))
  const targetRows = Math.max(10, Math.round(targetCols / aspect * 0.55))

  const { data } = imageData
  const threshold = config.edgeThreshold

  // Precompute grayscale
  const gray = new Float32Array(width * height)
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4
    gray[i] = (0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]) / 255
  }

  const xStep = width / targetCols
  const yStep = height / targetRows

  const grid: AsciiGrid = []

  for (let row = 0; row < targetRows; row++) {
    const gridRow = []
    for (let col = 0; col < targetCols; col++) {
      const cx = Math.min(Math.floor(col * xStep), width - 1)
      const cy = Math.min(Math.floor(row * yStep), height - 1)

      // Sobel kernels at sampled position
      let gx = 0, gy = 0
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const px = Math.max(0, Math.min(width - 1, cx + kx))
          const py = Math.max(0, Math.min(height - 1, cy + ky))
          const v = gray[py * width + px]
          gx += v * (kx === 0 ? 0 : kx / Math.abs(kx)) * (ky === 0 ? 2 : 1)
          gy += v * (ky === 0 ? 0 : ky / Math.abs(ky)) * (kx === 0 ? 2 : 1)
        }
      }

      const magnitude = Math.sqrt(gx * gx + gy * gy)
      const isEdge = magnitude > threshold

      // Sample original color for this cell
      const srcIdx = (cy * width + cx) * 4
      const sr = data[srcIdx], sg = data[srcIdx + 1], sb = data[srcIdx + 2]

      // Map edge strength to char
      const edgeStrength = Math.min(1, magnitude)
      const charIdx = Math.round(edgeStrength * (EDGE_CHARS.length - 1))
      const char = isEdge ? EDGE_CHARS[Math.min(charIdx, EDGE_CHARS.length - 1)] : ' '

      const l = magnitude // use magnitude as "luminance" for color filter
      const [cr, cg, cb] = applyColorFilter(row * targetCols + col, l, sr, sg, sb, config.colorEnabled, config.colorFilterId)

      gridRow.push({ char, r: cr, g: cg, b: cb })
    }
    grid.push(gridRow)
  }

  return grid
}
