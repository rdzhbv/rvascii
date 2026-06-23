import type { AsciiGrid, EffectType } from '../types'
import { isBlockEffect } from '../core/effects/registry'

export function exportJPG(grid: AsciiGrid, fontSize: number, effect: EffectType = 'ascii'): Promise<Blob> {
  return new Promise((resolve) => {
    const cols = grid[0]?.length || 1
    const rows = grid.length
    const block = isBlockEffect(effect)

    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#000'
    ctx.textBaseline = 'top'

    if (block) {
      const blockSize = fontSize
      const w = Math.round(cols * blockSize)
      const h = Math.round(rows * blockSize)
      canvas.width = w
      canvas.height = h
      ctx.fillRect(0, 0, w, h)
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cell = grid[r][c]
          ctx.fillStyle = `rgb(${cell.r},${cell.g},${cell.b})`
          ctx.fillRect(c * blockSize, r * blockSize, blockSize, blockSize)
        }
      }
    } else {
      const charW = fontSize * 0.6
      const charH = fontSize * 1.2
      const w = Math.round(cols * charW)
      const h = Math.round(rows * charH)
      canvas.width = w
      canvas.height = h
      ctx.fillRect(0, 0, w, h)
      ctx.font = `${fontSize}px monospace`
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const cell = grid[r][c]
          ctx.fillStyle = `rgb(${cell.r},${cell.g},${cell.b})`
          ctx.fillText(cell.char, c * charW, r * charH)
        }
      }
    }

    canvas.toBlob((blob) => resolve(blob!), 'image/jpeg', 0.92)
  })
}
