import { sampleImageDataGrid } from './pixel-processor'
import { luminanceToChar } from './character-mapper'
import { COLOR_FILTERS, type AsciiConfig, type AsciiGrid } from '../types'

function applyColorFilter(
  idx: number,
  l: number,
  r: number, g: number, b: number,
  colorEnabled: boolean,
  filterId: string
): [number, number, number] {
  if (!colorEnabled) {
    const v = Math.round(l * 255)
    return [v, v, v]
  }

  const filter = COLOR_FILTERS.find((f) => f.id === filterId)
  if (!filter || filter.type === 'source') {
    return [r, g, b]
  }

  if (filter.type === 'invert') {
    return [255 - r, 255 - g, 255 - b]
  }

  if (filter.type === 'monochrome' && filter.colors.length > 0) {
    const n = filter.colors.length
    const ci = Math.max(0, Math.min(n - 1, Math.round(l * (n - 1))))
    const [cr, cg, cb] = filter.colors[ci]
    return [cr, cg, cb]
  }

  if (filter.type === 'palette' && filter.colors.length > 0) {
    const n = filter.colors.length
    const ci = Math.max(0, Math.min(n - 1, Math.round(l * (n - 1))))
    const [cr, cg, cb] = filter.colors[ci]
    return [cr, cg, cb]
  }

  return [r, g, b]
}

export function convertImageData(
  imageData: ImageData,
  config: AsciiConfig
): AsciiGrid {
  const { width, height } = imageData
  const aspect = width / height
  const targetCols = Math.max(20, Math.round(100 * config.density * (aspect > 1 ? aspect : 1)))
  const targetRows = Math.max(10, Math.round(targetCols / aspect * 0.55))

  const { lum, r, g, b } = sampleImageDataGrid(imageData, targetCols, targetRows)
  const grid: AsciiGrid = []

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
      const char = luminanceToChar(l, config.charset, config.invert)
      const [cr, cg, cb] = applyColorFilter(idx, l, r[idx], g[idx], b[idx], config.colorEnabled, config.colorFilterId)
      gridRow.push({ char, r: cr, g: cg, b: cb })
    }
    grid.push(gridRow)
  }

  return grid
}
