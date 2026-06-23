import { COLOR_FILTERS } from '../types'

export function applyColorFilter(
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
